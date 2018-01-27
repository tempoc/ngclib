'use strict';

const inlineAssets = require('./inlineAssets');

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const chalk = require('chalk');
const gulpReplace = require('gulp-replace');
const prompt = require('prompt');
const rollup = require('rollup');
const uglify = require('uglify-js');
const vfs = require('vinyl-fs');

const OUT_FOLDER = 'ngclib-out/';
const GITIGNORE = '.gitignore';
const UTF_8 = 'utf-8';

const DEFAULT_LIBNAME = process.cwd().replace(/^.*\//i, '');
const CONFIG_FILE = 'ngclib.config.json';

let config = { };

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
${OUT_FOLDER}
`
    );

    printSuccess(`Added ${OUT_FOLDER} to ${GITIGNORE}.`);
}

function printSuccess(message) {
    console.log(chalk.green(message));
}

function copyTemplate() {
    vfs
        .src(path.join(__dirname, '../template', '**'))
        .pipe(gulpReplace('${libName}', config.libName))
        .pipe(gulpReplace('ngxLibtemplate', config.umdName))
        .pipe(vfs.dest('.'));
}

function moveSrcToTmp() {
    vfs
        .src('*.ts')
        .pipe(vfs.dest('./tmp/'));
}

function printHelp() {
    console.log(`
ngclib [init|build]
    `);
}

function ngc(configFile) {
    mySpawnSync('node_modules/.bin/ngc', ['-p', configFile]);
}

function mySpawnSync(command, argArray) {
    const child = spawnSync(command, argArray);

    if (child.stdout && child.stdout.toString && child.stdout.toString()) {
        console.log(child.stdout.toString());
    }

    if (child.stderr && child.stderr.toString && child.stderr.toString()) {
        printError(child.stderr.toString());
    }

    if (child.error) {
        throw child.error;
    }

    return child;
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
            }
        }
    }, function (err, result) {
        if (err) {
            throw err;
        }

        config.libName = result.libName || DEFAULT_LIBNAME;
        config.umdName = config.libName.split('-').map((_, i) => i ? _[0].toUpperCase() + _.slice(1) : _).join('');

        fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, '  '));

        cb();
    });
}

function readConfig() {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, UTF_8));
}

function generateLibraryModule() {
    mySpawnSync('ng', ['g', 'module', `lib/${config.libName}`]);
}

function myRollup(configFile, cb) {
    const config = require(path.join(process.cwd(), configFile));

    printSuccess(`Compiling ${config.input} into ${config.output.file}, according to ${configFile}.`);

    rollup
        .rollup(config)
        .then(
            _ => {
                _.write(config.output).then(() => {
                    if (cb) {
                        cb();
                    }
                }, _ => printError(_));
            },
            _ => printError(_)
        );
}

function amendPackageJson() {
    const PACKAGE_JSON_FILE = 'package.json';

    const contents = JSON.parse(fs.readFileSync(PACKAGE_JSON_FILE, UTF_8));
    contents.main = `./bundles/${config.libName}.umd.js`;
    contents.module = `./esm5/${config.libName}.js`;
    contents.es2015 = `./esm2015/${config.libName}.js`;
    contents.typings = `./${config.libName}.d.ts`;

    fs.writeFileSync(PACKAGE_JSON_FILE, JSON.stringify(contents, null, '  '));
}

function printKeyValuePair(key, value) {
    console.log(chalk.blue(`${key}: `) + chalk.underline(value));
}

function replacePrefix() {
    console.log(chalk.red('Not yet implemented: replacePrefix()'));
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
        printKeyValuePair('Output folder', OUT_FOLDER);
        printKeyValuePair('See what changed', 'git status');
        printKeyValuePair('Build library', process.argv[1].replace(/^.*\//, '') + ' build');
    });
}

function myUglify() {
    fs.writeFile(
        `${OUT_FOLDER}bundles/${config.libName}.umd.min.js`,
        uglify.minify(fs.readFileSync(`${OUT_FOLDER}bundles/${config.libName}.umd.js`, UTF_8))
    );
}

function copyAssets() {
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
        .pipe(vfs.dest(OUT_FOLDER));
}

function build() {
    readConfig();

    const src = './src';
    const dest = './tmp/src';

    moveSrcToTmp();
    inlineAssets(src, dest);
    ngc('tsconfig-esm2015.json');
    myRollup('rollup-esm2015.conf.js');
    ngc('tsconfig-esm5.json');
    myRollup('rollup-esm5.conf.js');
    myRollup('rollup-umd.conf.js', myUglify);
    copyAssets();
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
