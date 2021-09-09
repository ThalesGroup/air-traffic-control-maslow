import * as React from "react"
import {
    Route,
    Redirect
} from 'react-router-dom'

interface ProtectedRouteProperties {
    path: string;
    redirect: string;
    component: any;
    validationFunction: () => boolean;
}
/**
 * Protects a route according to a validation function and redirects if locked
 * 
 * <ProtectedRoute path="/timeline" component={Timeline}
                    validationFunction={isAllowed} redirect="/login" />

 * @param protectedRouteProps 
 */
export function ProtectedRoute(protectedRouteProps: ProtectedRouteProperties) {
    return <Route path={protectedRouteProps.path} render={(props) => {
        const isAuthenhicated = protectedRouteProps.validationFunction();
        if (!isAuthenhicated) {
            window["redirectLocation"] = location.pathname + location.search
        }
        return isAuthenhicated ? <protectedRouteProps.component />
            : <Redirect to={{
                pathname: protectedRouteProps.redirect,
                state: { from: props.location }
            }} />
    }} />
}