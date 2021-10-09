const path = require("path");
const HtmlWebpackPartialsPlugin = require("html-webpack-partials-plugin");

module.exports = {
  plugins: [
    new HtmlWebpackPartialsPlugin({
      path: path.join(__dirname, "./src/views/partials/search.html"),
      location: "search",
      template_filename: ["index-[contenthash].html"],
    }),
    new HtmlWebpackPartialsPlugin({
      path: path.join(__dirname, "./src/views/partials/results.html"),
      location: "results",
      template_filename: ["index-[contenthash].html"],
    }),
  ],
};
