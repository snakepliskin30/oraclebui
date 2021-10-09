const path = require("path");
const common = require("./webpack.common.prod");
const { merge } = require("webpack-merge");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlWebpackPartialsPlugin = require("html-webpack-partials-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCssAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = merge(common, {
  mode: "production",
  entry: {
    app: "./src/js/app.js",
  },
  output: {
    publicPath: "",
    path: path.resolve(__dirname, "SocoBUISearchExt"),
    filename: "[name].[contenthash].bundle.js",
  },
  optimization: {
    minimizer: [new OptimizeCssAssetsPlugin(), new TerserPlugin()],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].[contenthash].css",
    }),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      filename: "index-[contenthash].html",
      template: "./src/template.html",
      inject: "body",
      minify: {
        removeAttributeQuotes: true,
        collapseWhitespace: true,
        removeComments: true,
      },
    }),
  ],
  module: {
    rules: [
      {
        test: /\.html$/i,
        loader: "html-loader",
        options: {
          esModule: false,
          sources: {
            list: [
              "...",
              {
                tag: "script",
                attribute: "src",
                type: "src",
                filter: (tag, attribute, attributes, resourcePath) => {
                  for (i = 0; i < attributes.length; i++) {
                    if (attributes[i].value.includes("vendorlib")) {
                      return false;
                    }
                  }
                  return true;
                },
              },
              {
                tag: "link",
                attribute: "href",
                type: "src",
                filter: (tag, attribute, attributes, resourcePath) => {
                  for (i = 0; i < attributes.length; i++) {
                    if (attributes[i].value.includes("vendorlib")) {
                      return false;
                    }
                  }
                  return true;
                },
              },
            ],
          },
        },
      },
      {
        test: /\.(svg|png|jpg|gif)$/,
        use: {
          loader: "file-loader",
          options: {
            name: "[name].[ext]",
            outputPath: "img",
          },
        },
      },
      {
        //1. css-loader will run to convert css to javascript
        //2. instead of injecting css to dom via style-loader
        // we will use MiniCssExtractPlugin loader to extract the css
        // to a different css file
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                // {
                //   debug: true,
                //   modules: false, // defaults to auto
                // },
                {
                  useBuiltIns: "usage",
                  corejs: "3.0.0",
                },
              ],
            ],
          },
        },
      },
    ],
  },
});
