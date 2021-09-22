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

 import * as React from 'react'
import { Observable, BehaviorSubject } from "rxjs"
import socketIOClient from "socket.io-client"

export type ReactiveCoreClientOptions = {
    data: string[]
}
export class ReactiveCoreClient {

    static AUTH_STATE = 'AuthState';

    token: string = '';

    socket: any;

    streams: any[] = [];

    status$ = new BehaviorSubject<any>(Status.Disconnected);

    constructor(private uri: string, options?: ReactiveCoreClientOptions) {
        this.token = this.loadToken();

        if (options) {
            this.streams = options.data.map(name => {
                return {
                    id: name,
                    stream: new BehaviorSubject<any>(null)
                }
            });
        }
        const authStateStream = {
            id: ReactiveCoreClient.AUTH_STATE,
            stream: new BehaviorSubject<any>(null)
        };
        this.streams.unshift(authStateStream);
        this.connect();
    }

    connect() {
        this.socket = socketIOClient(this.uri);
        this.socket.on('connect', () => {
            this.status$.next(Status.Connected);
            if (this.token) {
                this.verifyToken();
            }
        });

        this.socket.on('disconnect', () => {
            this.status$.next(Status.Disconnected);
        });

        this.streams.forEach(streamReg => {
            this.onMessage(streamReg.id, (data) => {
                streamReg.stream.next(data);
            })
        })

        this.socket.connect();
    }

    setToken(token: string) {
        this.token = token;
    }

    getSocketId() {
        return this.socket.id;
    }

    onMessage(event, handler) {
        this.socket.on(event, handler);
        return {
            event,
            handler
        }
    }

    offMessage( event, handler ) {
        this.socket.off(event, handler);
        return {
            event,
            handler
        }
    }

    send(event: string, data: any) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    getRxStream(event: string): Observable<any> {
        const streamReg = this.streams.find(stream => stream.id === event);
        if (streamReg) {
            return streamReg.stream;
        }
        return null;
    }

    on(event: string, handler) {
        if (handler) {
            document.addEventListener(event, handler);
            return {
                event,
                handler
            };
        }
        return null;
    }

    off(reg) {
        if (reg) {
            document.removeEventListener(reg.event, reg.handler);
        }
    }

    verifyToken() {
        return this.postJSON('/api/verify-token');
    }

    register(email: string, password:string) {
        return this.postJSON('/api/register', { email,password });
    }

    registerRequest(email: string) {
         return this.postJSON('/api/register-request', { email });
    }

    async login(email: string,password:string,notify:boolean) {
        try {
            const res: any = await this.postJSON('/api/login', {
                email,
                password,
                notify,
            });
            return res;
        } catch (e) {
            return {error:e};
        }
    }

    getPwd(email: string) {
        return this.postJSON('/api/get-pwd', { email })
    }

    updateAccount(email: string, password:string) {
        return this.postJSON('/api/update-user', { email,password})
    }

    deleteAccount(email: string) {
        return this.postJSON('/api/delete-user', { email })
    }

    async getUsers() {
        try {
            const res: any = await this.postJSON('/api/get-users', {});
            return res;
        } catch (e) {
            return {error:e};
        }
    }

    async authWithCode(email: string, code: string, saveSession?: boolean) {
        try {
            const res: any = await this.postJSON('/api/auth-code', {
                email,
                code
            });
            this.setToken(res.token);
            if (saveSession) {
                this.saveToken(res.token);
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    async logout() {
        await this.postJSON('/api/logout')
        localStorage.setItem('userToken', '');
        this.token = '';
    }

    saveToken(token: string) {
        localStorage.setItem('userToken', token);
    }

    loadToken() {
        return localStorage.getItem('userToken');
    }

    getStatus() {
        return this.status$.getValue();
    }

    getAuthHeader() {
        return this.token ? `Bearer ${this.token}` : '';
    }


    dropUsers() {
        return this.getJSON('/api/drop-users');
    }


   async getFlights(bounds) {
    let res: any = await this.postJSON('/api/get-flights',{bounds});
    return res;
    }


    getJSON(path: string): Promise<any> {
        return new Promise((resolve, reject) => {

            const options = {
                method: 'GET',
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'x-socketid': this.getSocketId()
                }
            };
            fetch(path, options)
                .then(response => {
                    if (response.status !== 200) {
                        reject({
                            status: response.status,
                            message: response.statusText
                        });
                    }
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.indexOf("application/json") !== -1) {
                        return response.json().then(function (json) {
                            resolve(json as any);
                        });
                    } else {
                        resolve(null);
                    }
                })
        });
    }

    async postJSON(path: string, body?: any) {
        return new Promise((resolve, reject) => {
            const options = {
                method: 'POST',
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'x-socketid': this.getSocketId()
                },
                body: body ? JSON.stringify(body) : null
            };
            fetch(path, options)
                .then(response => {
                    if (response.status !== 200) {
                        reject({
                            status: response.status,
                            message: response.statusText
                        });
                    }
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.indexOf("application/json") !== -1) {
                        return response.json().then(function (json) {
                            resolve(json);
                        });
                    } else {
                        resolve(null);
                    }
                })
        });
    }

}

enum Status {
    Connected = 'Connected',
    Disconnected = 'Disconnected'
}

export function useRxCoreStatus(rxClient: ReactiveCoreClient) {
    const [status, setStatus] = React.useState<Status>(rxClient.getStatus());
    React.useEffect(() => {
        setStatus(rxClient.getStatus());

        function handleConnect() {
            setStatus(rxClient.getStatus());
        }

        const handler = rxClient.on('rxcore-status', handleConnect);

        return () => {
            if (handler) {
                rxClient.off(handler);
            }
        };
    }, []);

    return status;
}

export function useRxCoreEvent(rxClient: ReactiveCoreClient, event: string) {
    const [data, setDetails] = React.useState(null);

    React.useEffect(() => {
        const messageHandler = (message) => {
            setDetails(message)
        }
        const reg = rxClient.onMessage(event, messageHandler);
        return () => {
            rxClient.offMessage(reg.event,reg.handler);
        }
    }, []);
    return data;
}

export function useRxCoreData(rxClient: ReactiveCoreClient, event: string) {
    const [state, setState] = React.useState(null);
    React.useEffect(() => {
        function handleChange(newState) {
            setState(newState);
        }
        const subject$ = rxClient.getRxStream(event);

        const subscription = subject$ ? subject$.subscribe(handleChange) : null;
        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    });

    return state;
}
