
module.exports = function (grunt) {

  grunt.initConfig({
    umd: {
      all: {
        options: {
          src: 'src/whif.js',
          dest: 'dist/whif.js',
          globalAlias: 'whif',
          amdModuleId: 'whif',
          objectToExport: 'whif',
        }
      }
    }
  })

  grunt.loadNpmTasks('grunt-umd')
}
