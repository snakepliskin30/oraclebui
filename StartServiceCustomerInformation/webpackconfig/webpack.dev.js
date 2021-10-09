const path = require("path");
const webpack = require("webpack");
const common = require("./webpack.common");
const { merge } = require("webpack-merge");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlWebpackPartialsPlugin = require("html-webpack-partials-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  target: "web",
  entry: {
    app: "./src/js/app.js",
  },
  output: {
    path: path.resolve(__dirname, "SocoBUISearchExt"),
    filename: "[name].bundle.js",
  },
  devServer: {
    overlay: true,
    watchContentBase: true, //set to false for hmr
    //hotOnly: true, //enable this setting for hmr
  },
  plugins: [
    //new webpack.HotModuleReplacementPlugin(), //include for hmr
    new HtmlWebpackPlugin({
      template: "./src/template.html",
      inject: "body",
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
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
        //2. style loader will run to inject the css to dom
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
                  debug: true,
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
