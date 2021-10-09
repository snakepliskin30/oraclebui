const gulp = require("gulp");
const zip = require("gulp-zip");
const inject = require("gulp-inject-string");
const replace = require("gulp-replace");

gulp.task("insert", function (done) {
  gulp
    .src("./StartServiceCustomerInformation/index-*.html")
    .pipe(inject.before("<title>", '<script defer="defer" src="../vendorlib/vendor.js"></script>'))
    .pipe(gulp.dest("./StartServiceCustomerInformation/"));
  console.log("Insert task done!");
  done();
});

gulp.task("zip", function (done) {
  gulp.src("StartServiceCustomerInformation/**/*.*").pipe(zip("StartServiceCustomerInformation.zip")).pipe(gulp.dest("."));
  console.log("Zip task done");
  done();
});

gulp.task("copy", function () {
  console.log("Copy task done");
  return gulp.src(["./vendorlib/**/*"]).pipe(gulp.dest("./StartServiceCustomerInformation/vendorlib"));
});

gulp.task("replace", function (done) {
  gulp.src(["./StartServiceCustomerInformation/index.html"]).pipe(replace("../vendorlib", "vendorlib")).pipe(gulp.dest("./StartServiceCustomerInformation/"));
  console.log("replace task done");
  done();
});

gulp.task("copydependencies", function () {
  console.log("Copy task done");
  return gulp.src(["./src/js/dep/**/*"]).pipe(gulp.dest("./StartServiceCustomerInformation/"));
});
