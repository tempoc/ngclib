module.exports = {
    input: 'tmp/esm5/ngx-libtemplate.js',
    output: {
        file: 'ngclib-out/esm5/ngx-libtemplate.js',
        format: 'es'
    },
    external: [
        "@angular/core",
        "@angular/common",
        "@angular/common/http",
        "rxjs/Observable",
        "rxjs/add/observable/throw",
        "rxjs/add/observable/concat",
        "rxjs/add/operator/mergeMap",
        "rxjs/add/operator/do",
        "rxjs/add/operator/catch",
        "rxjs/add/observable/of"
    ]
};
