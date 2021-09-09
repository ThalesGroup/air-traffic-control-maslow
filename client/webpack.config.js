const WebpackBuilder = require("./WebpackBuilder");

const Assets = {
    ui: {
        tsconfig: './tsconfig.json',
        js: [{
            name: 'lib/index',
            sources: ['./src/index.tsx']
        }, {
            name: 'lib/vendor',
            sources: ["react", "react-dom"]
        }],
        html: [{
            filename: 'index.html',
            template: 'src/index.html',
            chunks: ['lib/index', 'lib/vendor']
        }],
        resources: [
            'resources/**/*',
            { from: 'src/robots.txt', to: 'robots.txt' },
            { from: 'src/sitemap.xml', to: 'sitemap.xml' },
            { from: 'resources/manifest.json', to: 'manifest.json' },
            { from: 'src/serviceWorker.js', to: 'serviceWorker.js' },
        ],
    }
}

module.exports = WebpackBuilder(Assets);
