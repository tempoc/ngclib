# ngclib
Derive an Angular library from an [Angular CLI](https://cli.angular.io/) project.

Inspiration and much of the source of this library came from this [video](https://youtu.be/K4YMmwxGKjY) and its [repo](https://github.com/juristr/ngx-tabs-libdemo).

With any luck the Angular team is close to producing a CLI solution to the creation of Angular libraries.

## How to use this?

1. `ng new my-library` to create your Angular CLI project.
1. `cd my-library` to go to the folder where your CLI project is contained.
1. `npm install --save-dev ngclib` to install this command line tool.
1. `node_modules/.bin/ngclib init` to generate the files necessary for your library to compile.
1. `npm run ngclib:build` to compile your library.
