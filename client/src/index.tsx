import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import "regenerator-runtime/runtime.js";
import * as serviceWorker from './serviceWorker';
import {GDPRBanner} from 'GDPRBanner';

import {
    Router,
    Route,
    AsyncLoader,
    ProtectedRoute,
    RouterHistory,
    Redirect
} from './ext/routing/Routing'


const App = () => <AsyncLoader component={import('./App/Main')} />


type AppShellProps = {
}

export const AppShell: React.FunctionComponent<AppShellProps> = (props) => {

    const [currentPath, setCurrentPath] = React.useState<string>(RouterHistory.location.pathname);

    React.useEffect(() => {
        const unlisten = RouterHistory.listen((location, action) => {
            // location is an object like window.location
            // console.log(action, location.pathname, location.state)
            setCurrentPath(location.pathname);
        });
        return () => {
            unlisten();
        }
    }, []);

    return <Router history={RouterHistory}>
        <Route exact path="/index.html">
            <Redirect to="/" />
        </Route>
        <Route exact path="/" component={App} />    
      <GDPRBanner/>
    </Router>

}



ReactDOM.render(<AppShell />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
