import * as React from 'react'

/**
 * 
 * Loads a component asynchronously, interpreted by webpack which splits the file
 * 
 * export default class Login extends React.Component<any, any> {
 * 
 * }
 * 
 * 
 * const Login = () => <AsyncLoader comp={import('./page/Login')} />
 */

export class AsyncLoader extends React.Component<Props, any> {
    
    component:any;

    constructor(props:any){
        super(props)
    }

    componentWillMount() {
        this.props.component.then(component => {
            this.component = component
            this.forceUpdate()
        })
    }
    render() {
        return this.component ? <this.component.default /> : <div></div>
    }
}

export interface Props {
    component:any
}
