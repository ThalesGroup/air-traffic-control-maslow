const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanObsoleteChunks = require('webpack-clean-obsolete-chunks');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const LiveReloadPlugin = require('webpack-livereload-plugin');

const isProduction = process.env.NODE_ENV === 'production';

const createUIConfig = (assets) => {
    const configUI = {

        entry: {
        },

        output: {
            filename: "[name]-[hash].js",
            publicPath: '/',
        },

        resolve: {
            alias: {
                'react': 'react/cjs/react.production.min',
                'react-dom': 'react-dom/cjs/react-dom.production.min'
            },
            plugins: [
                new TsconfigPathsPlugin({
                    configFile: assets.ui.tsconfig,
                    logLevel: "info",
                    extensions: [".ts", ".tsx", ".js", 'jsx'],
                    mainFields: ["browser"],
                    baseUrl: "./src"
                })
            ],
            // Add '.ts' and '.tsx' as resolvable extensions.
            extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
        },


        externals: [],

        module: {
            rules: [
                // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
                {
                    test: /\.tsx?$/,
                    loader: 'awesome-typescript-loader',
                    options: {
                        configFileName: assets.ui.tsconfig
                    }
                },
                {
                    test: /\.(js|jsx)$/,
                    exclude: /node_modules/,
                    use: {
                        loader: "babel-loader"
                    }
                },
                // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
                { enforce: "pre", test: /\.jsx?$/, loader: "source-map-loader" },

                // All output '.html' files will have any sourcemaps re-processed by 'html-loader'.
                { test: /\.html$/, loader: 'html-loader' },
                {
                    test: /\.scss$/,
                    use: [{
                        loader: "style-loader"
                    }, {
                        loader: "css-loader"
                    }, {
                        loader: "sass-loader",
                        options: {
                            includePaths: ["./node_modules"]
                        }
                    }]
                },
                { test: /\.css$/, use: ['style-loader', 'css-loader'] }
            ]
        },

        plugins: [
            new CleanObsoleteChunks({
                verbose: false
            }),
            new LiveReloadPlugin({
                appendScriptTag: true,
                useSourceHash: true,
                delay: 1000
            })
        ]
    }

    addAsset(configUI, assets);
    return configUI;
};

module.exports = (assets) => (env, argv) => {
    const configUI = createUIConfig(assets);
    const isDevelopment = argv.mode === 'development';
    if (isDevelopment) {
        configUI.devtool = 'source-map';
    }
    return [configUI];
};

function addAsset(config, asset) {
    const { ui } = asset;
    ui.js.forEach(js => {
        config.entry[js.name] = js.sources;
    });
    ui.html.forEach(html => {
        config.plugins.push(new HtmlWebpackPlugin(html));
    });

    ui.plugins && asset.plugins.forEach(plugin => {
        config.plugins.push(plugin);
    });

    if (ui.resources) {
        config.plugins.push(new CopyWebpackPlugin(ui.resources))
    }
}


