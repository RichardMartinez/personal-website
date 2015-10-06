// gulpfile.js

var argv = require('yargs').argv;
var babelify = require("babelify");
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var del = require('del');
var gulp = require('gulp');
var gulpif = require('gulp-if');
var merge = require('merge-stream');
var open = require('open');
var plugins = require('gulp-load-plugins')();
var reactify = require('reactify');
var runSequence = require('run-sequence');
var source = require('vinyl-source-stream');
var fs = require('fs');
var stylish = require('jshint-stylish');
var gulpSync = plugins.sync(gulp);

/*====================================================*\
Global Variables
\*====================================================*/

var opts = {
  server: {
    //add/change a shell variable for the host value here, if you want.
    host: process.env.VAR_PERSONAL_SITE_HOST || 'localhost',
    port: 1357
  },
  paths: {
    app: "./",
    tests: "./spec",
    compile: {
      styles: [{
        src: "./src/styles",
        dest: "./public/styles",
        main: "main.scss"
      }],
      scripts: [{
        src: "./src/js",
        dest: "./public/js",
        main: "entry.js"
      }],
      media: [{
        src: "./src/media",
        dest: "./public/media"
      }]
    },
    watch: [{
      glob: "./public/**/*.php",
      task: ['dev:reload']
    }, {   
      glob: ["./src/js/**/*.js",
        "./src/js/**/*.jsx",     "./src/js/*.js"   
      ],
      task: ['app:js']  
    }],
    copy: [{
        src:  "./src/media/other/**",
        dest: "./public/media/other"
      },
      {
        src:  './src/pages/**/*.html',
        dest: './public/pages'
      },
      {
        src:  './src/index.html',
        dest: './public'
      },
      {
        src:  './src/bootstrap/css/bootstrap.min.css',
        dest: './public/styles'
      }],
    delete: [{
      "src": [
        "./rev-manifest.json",
        '!./public/admin/**/*.!(min).{js,css,jpeg,jpg,png,gif,svg}',
        '!./public/**/*.!(min).{js,css,jpeg,jpg,png,gif,svg}'
      ]
    }]
  },
  lint: {
    paths: [
      './src/js/**/*.js'
    ],
    config: './.jshintrc'
  },
  switches: {
    sourcemaps: true,
    del: false,
    isProd: (argv.prod)
  },
  counter: 0
};

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

// gulp.task('app:rev', gulpSync.sync(['app:js', 'app:images', 'app:styles', 'app:delete', 'app:rev:create']));

// gulp.task('app:rev:create', function(){
//     var RevAll = new plugins.revAll({
// /*    dontRenameFile: [/^[^\\]+.\w{8}.\w+$/],
//     dontSearchFile: [/^[^\\]+.\w{8}.\w+$/]*/
//   });

//   return gulp.src([opts.paths.wpContent + '/{admin}/**/*.{js,css,jpeg,jpg,png,gif,svg}', '!'+opts.paths.wpContent + '/{admin}/**/*.!(min).{js,css,jpeg,jpg,png,gif,svg}'])
//     .pipe(RevAll.revision())
//     .pipe(gulp.dest(opts.paths.wpContent))
//     .pipe(RevAll.manifestFile())
//     .pipe(gulp.dest(process.cwd()))
//     .pipe(RevAll.versionFile())
//     .pipe(gulp.dest(process.cwd()));
// });


/*====================================================*\
JS Task(s)
\*====================================================*/

// gulp.task('app:js:hint', function() {
//   return gulp.src(opts.lint.paths)
//     .pipe(plugins.jshint(opts.lint.config))
//     .pipe(plugins.jshint.reporter(stylish));
// });

// gulp.task('app:js', ['app:js:hint'], function() {

//   var tasks = [];
//   opts.paths.compile.scripts.forEach(function(compile) {
//     var browserifyCustom = browserify({
//         entries: compile.src + '/' + compile.main,
//         debug: true
//       }).transform(babelify)
//       .transform(reactify);

//     tasks.push(browserifyCustom.bundle()
//       .on('error', function(err) {
//         var displayErr = plugins.util.colors.red(err);
//         plugins.util.log(displayErr);
//       })
//       .pipe(source(compile.main))
//       .pipe(buffer())
//       .pipe(plugins.sourcemaps.init({
//         loadMaps: opts.switches.sourcemaps
//       }))
//       // Add transformation tasks to the pipeline here.
//       .pipe(gulpif(opts.switches.isProd, plugins.uglify()))
//       .pipe(plugins.rename('bundle.js'))
//       .pipe(plugins.sourcemaps.write(null, {
//         addComment: opts.switches.sourcemaps
//       }))
//       .on('error', plugins.util.log)
//       .pipe(gulp.dest(compile.dest))
//       .pipe(gulpif(!opts.switches.isProd, plugins.connect.reload()))
//     );
//   });

//   return merge(tasks);
// });


/*====================================================*\
Image(s) Task(s)
\*====================================================*/

gulp.task('app:images', gulpSync.sync(['app:any-images', 'app:copy']), function() {
  gulpif(!opts.switches.isProd, plugins.connect.reload());
});

gulp.task('app:any-images', function() {

  var tasks = [];

  opts.paths.compile.media.forEach(function(compile) {

    //define current source for multiuse
    var currentSrc = compile.src + '/**/*.{svg,png,jpg,gif}';

    tasks.push(gulp.src(currentSrc)
      //remove files/directories from dest that are no longer(not in) in src, before acting on files from source (for production only).
      .pipe(gulpif(!opts.switches.isProd, plugins.cleanDest(compile.dest), del(compile.dest + '/*')))

      //Filter in only files that are newer, except for production build
      //If only some files compile, we will be missing some.
      .pipe(gulpif(!opts.switches.isProd, plugins.changed(compile.dest), gulp.src(currentSrc)))
      //log each file name
      .pipe(plugins.debug({
        title: compile.src
      }))

      .pipe(plugins.imagemin({
        progressive: true,
        multipass: true,
        svgoPlugins: [{
            removeEmptyAttrs: true
          }, {
            removeViewBox: false
          }, {
            cleanupIDs: false
          }, {
            convertPathData: true
          }, {
            removeXMLProcInst: false
          }
          //see https://github.com/svg/svgo/tree/master/plugins for more options
        ],
        //for additional imagemin plugins put them here
        use: []
      }))
      .pipe(gulp.dest(compile.dest))
    );
  });

  return merge(tasks);
});

/*====================================================*\
Style Task(s)
\*====================================================*/

gulp.task('app:styles', function() {

  var tasks = [];

  opts.paths.compile.styles.forEach(function(compile) {
    opts.counter++;

    tasks.push(plugins.rubySass(compile.src + '/' + compile.main, {
        verbose: true,
        compass: true,
        style: 'compressed',
        //this should be a development feature only.
        sourcemap: opts.switches.sourcemaps,
        container: 'styles' + opts.counter
      })
      .on('error', function(err) {
        console.error('Error!', err.message);
      })
      .pipe(plugins.plumber())
      .pipe(plugins.autoprefixer({
        browsers: ['last 4 versions'],
        cascade: false
      }))
      //use source maps for development
      .pipe(plugins.sourcemaps.write())
      .pipe(gulp.dest(compile.dest))
      .pipe(gulpif(!opts.switches.isProd, plugins.connect.reload()))
    );
  });

  return merge(tasks);
});

/*====================================================*\
Copy Task(s)
\*====================================================*/

gulp.task('app:copy', function() {

  var tasks = [];

  opts.paths.copy.forEach(function(copy) {
    tasks.push(gulp.src(copy.src)
      .pipe(gulp.dest(copy.dest)));
  });

  return merge(tasks);
});

/*====================================================*\
Delete Task(s)
\*====================================================*/

// gulp.task('app:delete', function() {

//   opts.paths.delete.forEach(function(deleteMe) {
//     var doesFileExist = function(fileString){
//       fs.stat(fileString, function(err, stat) {
//         if (err == null) {
//           del(fileString);
//         } else {
//           //console.log(fileString+': '+err.code);
//         }
//       });
//     };
//     if (Array.isArray(deleteMe.src)) {
//       deleteMe.src.forEach(function(string) {
//         gulp.src(string).pipe(plugins.tap(function(file, t) {
//           doesFileExist(file.path);
//         }));
//       });
//     } else if (typeof deleteMe.src === 'string') {
//       gulp.src(deleteMe.src).pipe(plugins.debug());
//       doesfileExist(deleteMe.src);
//     }
//   });

// });

/*====================================================*\
Inject Task(s)
\*====================================================*/

// gulp.task('app:inject', ['app:inject:svg']);

// gulp.task('app:inject:svg', function() {

//     return gulp.src('./public/template-where-we-lend.php')
//     .pipe(plugins.inject(gulp.src(['./public/media/svg/wwl-map.svg']), {
//       starttag: '<!--inject:svg -->',
//       transform: function fileContents (filePath, file) {
//         return file.contents.toString('utf8')
//       }
//     }))
//     .pipe(gulp.dest('./public/'));
// });


/*====================================================*\
Reload Task(s)
\*====================================================*/

gulp.task('dev:reload', function() {
  return gulp.src(opts.paths.watch[0].glob)
    .pipe(plugins.connect.reload());
});


/*====================================================*\
Watch Task(s)
\*================================================*/
gulp.task('dev:watch', function() {

  // opts.paths.compile.media.forEach(function(compile) {
  //   gulp.watch(compile.src + '/**', ['app:images']);
  // });

  opts.paths.compile.styles.forEach(function(compile) {
    gulp.watch([compile.src + '/**/*.scss', compile.src + '/*.scss'], ['app:styles']);
  });
  //watches for php and js
  // opts.paths.watch.forEach(function(watch) {
  //   gulp.watch(watch.glob, watch.task);
  // });
});



/*====================================================*\
JS Tests Task(s)
\*====================================================*/



/*====================================================*\
Build Task(s)
\*====================================================*/

//eventually take the dev dependency directories out of the WP directory
// gulp.task('app:clean-and-default', function() {
//   //turn on production switch to turn off compiling only changed files
//   opts.switches.isProd = true;
//   //change the sourcemaps switch to false, before default runs.
//   opts.switches.sourcemaps = false;
//   //turn on image directory clean for production
//   opts.switches.del = true;
//   //run only necessary tasks
//   runSequence('app:rev', 'app:inject');
// });

/*====================================================*\
GROUP DEFAULT Task(S)
\*====================================================*/

gulp.task('default', [/*'app:delete', 'app:js', */'app:images', 'app:styles'/*, 'app:inject'*/, 'app:server']);

//set up sync to make one task dependent on the other
gulp.task('withwatch', gulpSync.sync(['default', 'dev:watch']));

/*====================================================*\
GROUP BUILD PROD Task
\*====================================================*/

//gulp.task('build', ['app:clean-and-default']);