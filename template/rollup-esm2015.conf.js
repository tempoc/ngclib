module.exports = {
    input: 'tmp/esm2015/${libName}.js',
    output: {
        file: '${outFolder}/esm2015/${libName}.js',
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
