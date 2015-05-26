/*====================================================*\
Global Variables
\*====================================================*/

var opts = {
  server: {
    //add/change a shell variable for the host value here, if you want.
    host: /*process.env.VAR_ORM_HOST ||*/ 'localhost',
    port: 2121
  },
  paths: {
    app: "./",
    tests: "./spec",
    scripts: './js',
    styles: './styles',
    media: './media',
    dist: './dist'
  },
  lint: {
    paths: [
      './js/**/*.js'
    ],
    config: './.jshintrc'
  },
  switches: {
    sourcemaps: true
  }
};

var gulp = require('gulp');
var stylish = require('jshint-stylish');
var open = require('open');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var runSequence = require('run-sequence');
var del = require('del');
var plugins = require('gulp-load-plugins')();
var gulpSync = plugins.sync(gulp);

/*====================================================*\
Server Task(s)
\*====================================================*/

gulp.task('app:server', function() {
  plugins.connect.server({
    livereload: true,
    host: opts.server.host,
    port: opts.server.port,
    root: opts.paths.app
  });

  open('http://' + opts.server.host + ':' + opts.server.port);
});


/*====================================================*\
JS Task(s)
\*====================================================*/

gulp.task('app:js:hint', function(){
    return gulp.src(opts.lint.paths)
    .pipe(plugins.jshint(opts.lint.config))
    .pipe(plugins.jshint.reporter(stylish));
});

gulp.task('app:js', ['app:js:hint'], function() {

  var browserifyCustom = browserify({
    entries: opts.paths.scripts + '/browserify/entry.js',
    debug: true
  });

  return browserifyCustom.bundle()
    .pipe(source('entry.js'))
    .pipe(buffer())
    .pipe(plugins.sourcemaps.init({loadMaps: opts.switches.sourcemaps}))
    // Add transformation tasks to the pipeline here.
    .pipe(plugins.uglify())
    .pipe(plugins.rename('bundle.js'))
    .pipe(plugins.sourcemaps.write(null, {addComment: opts.switches.sourcemaps}))
    .on('error', plugins.util.log)
    .pipe(gulp.dest(opts.paths.scripts + '/browserify'));
});


/*====================================================*\
Image(s) Task(s)
\*====================================================*/

gulp.task('app:images', gulpSync.sync(['app:any-images','app:svg']), function(){
  plugins.connect.reload();
});

gulp.task('app:any-images', function(){
  //add image min here
  return gulp.src(opts.paths.media + '/**/*')
    .pipe(plugins.imagemin({
      progressive: true,
      multipass: true,
      svgoPlugins: [
        {removeViewBox: false},
        {removeEmptyAttrs: true }
        //see https://github.com/svg/svgo/tree/master/plugins for more options
      ],
      //for additional imagemin plugins put them here
      use: []
    }))
    .pipe(gulp.dest(opts.paths.media));
});

// generate pngs from svgs
gulp.task('app:svg', function() {
  //delete generated directory before generating pngs from svgs
  del(opts.paths.media + '/images/generated/**/*');

  return plugins.iconify({
    src: opts.paths.media + '/svg/**/*.svg',
    pngOutput: opts.paths.media + '/images/generated',
    scssOutput: opts.paths.styles + '/iconify/svg',
    cssOutput: opts.paths.styles + '/iconify/css',
    styleTemplate: opts.paths.media + '/svg/icon-gen.template',
    svgoOptions: {
      enabled: false
    }
  });
});

/*====================================================*\
Style Task(s)
\*====================================================*/

gulp.task('app:styles', function() {
  return plugins.rubySass(opts.paths.styles + '/main.scss', {
      verbose: true,
      compass: true,
      style: 'compressed',
      //this should be a development feature only.
      sourcemap: opts.switches.sourcemaps,
    })
    .on('error', function(err) {
      console.error('Error!', err.message);
    })
    .pipe(plugins.plumber())
    .pipe(plugins.autoprefixer({
      browsers: ['last 100 versions'],
      cascade: false
    }))
    //use source maps for development
    .pipe(plugins.sourcemaps.write())
    .pipe(gulp.dest(opts.paths.styles))
    .pipe(plugins.connect.reload());
});

/*====================================================*\
Reload Task(s)
\*====================================================*/

gulp.task('dev:reload', function() {
  return gulp.src(opts.paths.app + '/index.html')
  .pipe(plugins.connect.reload());
});


/*====================================================*\
Watch Task(s)
\*====================================================*/
gulp.task('dev:watch', function(){
    gulp.watch(opts.paths.media + '/**/*.{svg, png, jpg, gif}', ['app:images']);

    gulp.watch([
      opts.paths.styles + '/!(iconify)/**/*.scss',
      opts.paths.styles + '/*.scss'
    ], ['app:styles']);
  //gulp.watch(opts.paths.app + '/components/**/*.js', ['dev:reload']);
    gulp.watch(opts.paths.app + 'index.html', ['dev:reload']);
});



/*====================================================*\
JS Tests Task(s)
\*====================================================*/



/*====================================================*\
Build Task(s)
\*====================================================*/

//eventually take the dev dependency directories out of the WP directory
gulp.task('app:clean-and-default', function() {
  //change the sourcemaps switch to false, before default runs.
  opts.switches.sourcemaps = false;
  //run the default task
  runSequence('default');
});

/*====================================================*\
GROUP DEFAULT Task(S)
\*====================================================*/

gulp.task('default', ['app:js', 'app:images', 'app:styles', 'app:server']);

//set up sync to make one task dependent on the other
gulp.task('withwatch', gulpSync.sync(['default', 'dev:watch']));

/*====================================================*\
GROUP COPY Task
\*====================================================*/

//hogulp.task('copy', ['dev:local-test']);

/*====================================================*\
GROUP BUILD PROD Task
\*====================================================*/

gulp.task('build', ['app:clean-and-default']);