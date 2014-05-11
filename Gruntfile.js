module.exports = function( grunt ) {
  
  var 

  DOCS_OUT = 'docs',
  DOCS_IN = [
    'README.md',
    'src/promise.js'
  ];
  LIVERELOAD = true;

  grunt.initConfig( {

    clean: {
      docs: {
        src: DOCS_OUT,
      }
    },

    docker: {
      app: {
        expand: true,
        src: DOCS_IN,
        dest: DOCS_OUT,
        options: {
          onlyUpdated: false,
          colourScheme: 'tango',

          // 'autumn'
          // 'borland'
          // 'bw'
          // 'colorful'
          // 'default'
          // 'emacs'
          // 'friendly'
          // 'fruity'
          // 'manni'
          // 'monokai'
          // 'murphy'
          // 'native'
          // 'pastie'
          // 'perldoc'
          // 'rrt'
          // 'tango'
          // 'trac'
          // 'vim'
          // 'vs'


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
          'dist/promise.min.js': ['src/promise.js']
        }
      }
    },

    connect: {
      docs: {
        options: {
          livereload: LIVERELOAD,
          hostname: '*',
          keepalive: true,
          port: 8000,
          base: DOCS_OUT
        }
      }
    },

    watch: {
      options: {
        livereload: LIVERELOAD
      },
      jsdoc: {
        files: DOCS_IN,
        tasks: ['docker']
      }
    }

  } );

  // task libs
  [
    'grunt-contrib-connect',
    'grunt-contrib-watch',
    'grunt-contrib-clean',
    'grunt-contrib-uglify',
    'grunt-docker',
  ].forEach( grunt.loadNpmTasks, grunt );

  // task definitions
  grunt.registerTask( 'default', 'Generate and serve documentation', [
    'clean:docs',
    'docker',
    'connect:docs'
  ] );
}