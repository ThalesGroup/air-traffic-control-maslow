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