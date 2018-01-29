'use strict';

const inlineAssets = require('./inlineAssets');

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const chalk = require('chalk');
const gulpReplace = require('gulp-replace');
const prompt = require('prompt');
const rollup = require('rollup');
const uglify = require('uglify-js');
const vfs = require('vinyl-fs');

const GITIGNORE = '.gitignore';
const UTF_8 = 'utf-8';

const DEFAULT_LIBNAME = process.cwd().replace(/^.*\//i, '');
const CONFIG_FILE = 'ngclib.config.json';

let config = {
    prefix: 'ngx',
    outFolder: 'ngclib-out'
};

prompt.message = 'Question...';
prompt.delimiter = ' ';

/**
 * Adds the following entries to .gitignore
 * - ngclib-out/
 */
function gitignore() {
    fs.appendFile(
        GITIGNORE,
        `
# ngclib output dir
${config.outFolder}/
`
    );

    printSuccess(`Added ${config.outFolder}/ to ${GITIGNORE}.`);
}

function printSuccess(message) {
    console.log(chalk.green(message));
}

function copyTemplate() {
    vfs
        .src(path.join(__dirname, '../template', '**'))
        .pipe(gulpReplace('${libName}', config.libName))
        .pipe(gulpReplace('${umdName}', config.umdName))
        .pipe(gulpReplace('${outFolder}', config.outFolder))
        .pipe(vfs.dest('.'));
}

function moveSrcToTmp() {
    return new Promise((resolve, reject) => {
        vfs
            .src('*.ts')
            .pipe(vfs.dest('./tmp/'))
            .on('end', () => resolve())
            .on('error', reject);
    });
}

function printHelp() {
    console.log(`
ngclib [init|build]
    `);
}

function ngc(configFile) {
    return new Promise((resolve, reject) => {
        mySpawn('node_modules/.bin/ngc', ['-p', configFile])
            .on('close', () => resolve())
            .on('error', reject);
    });
}

function mySpawn(command, argArray) {
    return spawn(command, argArray);
}

function printError(message) {
    console.log(chalk.red(message));
}

function askInitQuestions(cb) {
    prompt.start();

    prompt.get({
        properties: {
            libName: {
                description: `What is the library name? (${DEFAULT_LIBNAME})`
            },
            prefix: {
                description: `What is the prefix? (${config.prefix})`
            },
            outFolder: {
                description: `What is the library build output folder? (${config.outFolder})`
            }
        }
    }, function (err, result) {
        if (err) {
            throw err;
        }

        config.libName = result.libName || DEFAULT_LIBNAME;
        config.umdName = config.libName.split('-').map((_, i) => i ? _[0].toUpperCase() + _.slice(1) : _).join('');
        config.prefix = result.prefix || config.prefix;
        config.outFolder = result.outFolder || config.outFolder;

        fs.writeFile(CONFIG_FILE, defaultStringify(config), cb);
    });
}

function readConfig() {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, UTF_8));
}

function generateLibraryModule() {
    mySpawn('ng', ['g', 'module', `lib/${config.libName}`]);
}

function myRollup(configFile) {
    return new Promise((resolve, reject) => {
        const config = require(path.join(process.cwd(), configFile));

        printSuccess(`Compiling ${config.input} into ${config.output.file}, according to ${configFile}.`);

        rollup
            .rollup(config)
            .then(
                _ => {
                    _.write(config.output).then(() => {
                        resolve();
                    }, reject);
                },
                reject
            );
    });
}

function amendPackageJson() {
    amendJsonFile('package.json', contents => {
        contents.main = `./bundles/${config.libName}.umd.js`;
        contents.module = `./esm5/${config.libName}.js`;
        contents.es2015 = `./esm2015/${config.libName}.js`;
        contents.typings = `./${config.libName}.d.ts`;

        return contents;
    });
}

function printKeyValuePair(key, value) {
    console.log(chalk.blue(`${key}: `) + chalk.underline(value));
}

function defaultStringify(obj) {
    return JSON.stringify(obj, null, '  ');
}

function amendJsonFile(file, action) {
    fs.readFile(file, UTF_8, (err, data) => {
        if (err) {
            throw err;
        }

        let contents = JSON.parse(data);

        contents = action(contents);

        fs.writeFile(file, defaultStringify(contents));
    });
}

function replacePrefix() {
    amendJsonFile('.angular-cli.json', contents => {
        contents.apps[0].prefix = config.prefix;

        return contents;
    });

    amendJsonFile('tslint.json', contents => {
        contents.rules['directive-selector'][2] = config.prefix;
        contents.rules['component-selector'][2] = config.prefix;

        return contents;
    });
}

function init() {
    askInitQuestions(() => {
        gitignore();
        copyTemplate();
        generateLibraryModule();
        amendPackageJson();
        replacePrefix();
        printSuccess(`
Angular CLI project has been decorated to produce a library.
                `);
        printKeyValuePair('Module Name', config.libName);
        printKeyValuePair('UMD Name', config.umdName);
        printKeyValuePair('Output folder', config.outFolder);
        printKeyValuePair('See what changed', 'git status');
        printKeyValuePair('Build library', process.argv[1].replace(/^.*\//, '') + ' build');
        printKeyValuePair('Publish Library', `npm publish ${config.outFolder}`);
    });
}

function myUglify() {
    return new Promise((resolve, reject) => {
        try {
            fs.readFile(`${config.outFolder}/bundles/${config.libName}.umd.js`, UTF_8, (err, data) => {
                if (err) {
                    reject(err);
                }

                fs.writeFile(
                    `${config.outFolder}/bundles/${config.libName}.umd.min.js`,
                    uglify.minify(data),
                    resolve
                );
            });
        } catch (err) {
            reject(err);
        }
    });
}

function copyAssets() {
    return new Promise((resolve, reject) => {
        vfs
            .src([
                'tmp/esm2015/*.d.ts',
                'tmp/esm2015/src',
                'tmp/esm2015/*.json',
                'package.json',
                'README.md',
                'LICENSE.txt'
            ], {
                allowEmpty: true
            })
            .pipe(vfs.dest(`${config.outFolder}/`))
            .on('end', () => resolve())
            .on('error', reject);
    });
}

function build() {
    readConfig();

    moveSrcToTmp()
        .then(() => inlineAssets('./src', './tmp/src'))
        .then(() => {
            const esm2015 = ngc('tsconfig-esm2015.json')
                .then(() => myRollup('rollup-esm2015.conf.js'))
                .then(copyAssets);

            const esm5 = ngc('tsconfig-esm5.json')
                .then(() => myRollup('rollup-esm5.conf.js'))
                .then(() => myRollup('rollup-umd.conf.js'))
                .then(myUglify);

            return Promise.all([esm2015, esm5]);
        });
}

module.exports = function (args) {
    const command = args[0];

    switch (command) {
        case 'init':
            init();
            break;
        case 'build':
            build();
            break;
        default:
            printHelp();
    }
};
