const gulp = require("gulp");
const zip = require("gulp-zip");
const inject = require("gulp-inject-string");
const replace = require("gulp-replace");

gulp.task("insert", function (done) {
  gulp
    .src("./StartServiceFinalItems/index-*.html")
    .pipe(inject.before("<title>", '<script defer="defer" src="../vendorlib/vendor.js"></script>'))
    .pipe(gulp.dest("./StartServiceFinalItems/"));
  console.log("Insert task done!");
  done();
});

gulp.task("zip", function (done) {
  gulp.src("StartServiceFinalItems/**/*.*").pipe(zip("StartServiceFinalItems.zip")).pipe(gulp.dest("."));
  console.log("Zip task done");
  done();
});

gulp.task("copy", function () {
  console.log("Copy task done");
  return gulp.src(["./vendorlib/**/*"]).pipe(gulp.dest("./StartServiceFinalItems/vendorlib"));
});

gulp.task("replace", function (done) {
  gulp.src(["./StartServiceFinalItems/index.html"]).pipe(replace("../vendorlib", "vendorlib")).pipe(gulp.dest("./StartServiceFinalItems/"));
  console.log("replace task done");
  done();
});

gulp.task("copydependencies", function () {
  console.log("Copy task done");
  return gulp.src(["./src/js/dep/**/*"]).pipe(gulp.dest("./StartServiceFinalItems/"));
});
