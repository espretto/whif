module.exports = function (grunt) {

  var docs_out = 'docs',
    docs_in = [
      'README.md',
      'src/whif.js'
    ],
    task_libs = [
      'grunt-contrib-clean',
      'grunt-contrib-uglify',
      'grunt-contrib-jshint',
      'grunt-browserify',
      'grunt-docker',
    ];

  grunt.initConfig({

    clean: {
      docs: {
        src: docs_out,
      }
    },

    docker: {
      app: {
        expand: true,
        src: docs_in,
        dest: docs_out,
        options: {
          onlyUpdated: false,
          colourScheme: 'tango',
          ignoreHidden: false,
          sidebarState: true,
          exclude: [],
          lineNums: true,
          js: [],
          css: [],
          extras: ['goToLine', 'fileSearch']
        }
      }
    },

    uglify: {
      options: {
        // beautify: true,
        preserveComments: 'some',
        compress: {
          // global_defs: {
          //   "DEBUG": false
          // },
          // dead_code: true
        }
      },
      all: {
        files: {
          'dist/whif.min.js': ['src/whif.js']
        }
      }
    },

    browserify: {
      test: {
        files: {
          'test/whif.test.bundle.js': 'test/whif.test.js'
        }
      }
    },

    jshint: {
      options: {
        jshintrc: './.jshintrc'
      },
      all: ['Gruntfile.js', 'test/whif.test.js', 'src/whif.js']
    }

  });

  task_libs.forEach(grunt.loadNpmTasks, grunt);

  grunt.registerTask('docs', [
    'clean',
    'docker'
  ]);

  grunt.registerTask('default', [
    'jshint',
    'uglify',
    'browserify'
  ]);
};