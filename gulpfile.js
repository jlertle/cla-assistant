'use strict';

const gulp = require('gulp');
const config = require('./gulp.config')();


const eslint = require('gulp-eslint');
const tslint = require('gulp-tslint');

const nodemon = require('gulp-nodemon');
const env = require('gulp-env');
const mocha = require('gulp-mocha');
const istanbul = require('gulp-istanbul');

const tsc = require('gulp-typescript');
const tscOptions = tsc.createProject('tsconfig.json');
const inlineNg2Template = require('gulp-inline-ng2-template');
const assets = require('gulp-assets');

const del = require('del');

gulp.task('source', () => {
    env('.env.json');
});

gulp.task('clean', () => {
    return del(['./dist']);
});

gulp.task('compile', ['clean'], function(){
    //compile client files, use ng2template for now to support unit tests, should be separated later
    let tsResult = gulp.src(['./src/client/*.ts', './src/client/**/*.ts','./src/client/**/**/*.ts'])
        .pipe(inlineNg2Template({ base: '//src' }))
        .pipe(tsc(tscOptions));

    tsResult.js.pipe(gulp.dest('./dist/client'));

    // compile assets
    gulp.src(['./src/*.html','./src/**/*.html'])
    .pipe(assets({
        js: true,
        css: false
    }))
    .pipe(gulp.dest('./dist/client'));
});

gulp.task('start', ['source','compile'], (cb) => {
    require('./app.js');
    process.on('SIGINT', () => {
        process.exit();
        cb();
    });
});

gulp.task('restart', ['source'], () => {
    let stream = nodemon({
        script: './app.js',
        exec: 'node-inspector & node --debug',
        watch: 'src',
        ext: 'js json'
    }).on('restart', () => {
        console.log('restarted');
    });
    return stream;
});

gulp.task('eslint', () => {
    return gulp.src('src/**/*.js')
        .pipe(eslint())
        .pipe(eslint.format());
});

gulp.task('tslint', function(){
      return gulp.src('src/**/*.ts')
        .pipe(tslint())
        .pipe(tslint.report('verbose'));
});

gulp.task('pre-test', function () {
  return gulp.src(['src/server/**/*.js', '!./src/**/*.spec.js'])
    .pipe(istanbul())
    .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], () => {
    gulp.src(['./src/server/**/*.spec.js'], {
        read: false
    })
    .pipe(mocha())
    .pipe(istanbul.writeReports({
        dir: './coverage',
        reporters: [ 'lcovonly', 'html'],
        reportOpts: { dir: './coverage' }
    }))
    // Enforce a coverage of at least 90%
    .pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }));
});


gulp.task('default', ['start']);
gulp.task('lint', ['eslint', 'tslint']);