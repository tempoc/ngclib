// All credit to https://youtu.be/K4YMmwxGKjY and
// https://github.com/juristr/ngx-tabs-libdemo/blob/master/inlineAssets.js

const vfs = require('vinyl-fs');
const inlineNg2Template = require('gulp-inline-ng2-template');

module.exports = function (src, dest) {
    vfs
        .src([`${src}/**/*.ts`])
        .pipe(
            inlineNg2Template({
                base: `${src}`,
                useRelativePaths: true
            })
        )
        .pipe(vfs.dest(`${dest}`));
};
