/*
 *  ----------------------------------------------------------------------------
 *
 *  Copyright (c) 2021 - THALES LAS/AMS
 *
 *  -----------------------------------------------------------------------------
 *  THALES MAKES NO REPRESENTATIONS OR WARRANTIES ABOUT THE SUITABILITY OF
 *  THE SOFTWARE, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 *  TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 *  PARTICULAR PURPOSE, OR NON-INFRINGEMENT. THALES SHALL NOT BE
 *  LIABLE FOR ANY DAMAGES SUFFERED BY LICENSEE AS A RESULT OF USING,
 *  MODIFYING OR DISTRIBUTING THIS SOFTWARE OR ITS DERIVATIVES.
 *
 *  THIS SOFTWARE IS NOT DESIGNED OR INTENDED FOR USE OR RESALE AS ON-LINE
 *  CONTROL EQUIPMENT IN HAZARDOUS ENVIRONMENTS REQUIRING FAIL-SAFE
 *  PERFORMANCE, IN WHICH THE FAILURE OF THE
 *  SOFTWARE COULD LEAD DIRECTLY TO DEATH, PERSONAL INJURY, OR SEVERE
 *  PHYSICAL OR ENVIRONMENTAL DAMAGE ("HIGH RISK ACTIVITIES"). THALES 
 *  SPECIFICALLY DISCLAIMS ANY EXPRESS OR IMPLIED WARRANTY OF FITNESS FOR
 *  HIGH RISK ACTIVITIES.
 *
 *  -----------------------------------------------------------------------------
 */

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
