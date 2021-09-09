'use strict';

import { ServiceContext } from "./ServerKit";
import leveldown from "leveldown";
import { Hexastore } from '../hexastore/Hexastore';
import moment from "moment";
import { FileIO } from "../FileIO";

const conf = FileIO.loadJSONData('./config/conf.json');
const AUTH_STATE = 'AuthState';

export type ServerAuthOptions = {
  path?: string,
  appName: string,
  authUrl: string
}

const DEFAULT_OPTIONS: ServerAuthOptions = {
  path: './auth-db',
  appName: conf.appName,
  authUrl: conf.url
}

const MAX_CODE_VALIDITY_IN_MINUTES = 3;
export class ServerAuth {

  oneTimeStore: Hexastore;

  usersStore: Hexastore;

  constructor(private options: ServerAuthOptions) {
    this.options = options ? options : DEFAULT_OPTIONS;
    const {path} = this.options;
    const basePath = path ? path : DEFAULT_OPTIONS.path;
    this.oneTimeStore = new Hexastore(leveldown, `${basePath}/auth`);
    this.usersStore = new Hexastore(leveldown, `${basePath}/users`);
  }

  async logUsers() {
    let storedUsersKeys = await this.usersStore.getAllKeys();
    let storedUsers = await this.usersStore.getNodes(storedUsersKeys);
    let result = storedUsers.filter(item => item.email).map(function(item){return {email:item.email};});

    let text = JSON.stringify(result.map(function(item){return {email:item.email}}));
    console.log("USERS");
    console.log("-----");
    console.log(text);
       
    return result;
  }
  
  async getUsers(cxt: ServiceContext, res) {
    let result = await this.logUsers();
    res.status(200).json(result).send();
  }

  async dropUsers(cxt: ServiceContext, res) {
    await this.usersStore.drop();
    console.log('[DROP USERS DB]');
    res.status(200).send();
  }


  async registerUser(cxt: ServiceContext, res) {
    const { query, body, io } = cxt;
    const { email, password } = body;

   console.log("REGISTER USER: "+email);

    const user = {
      kind: 'User',
      id: Hexastore.uuid(),
      email,
      password
    };

    let storedUser1 = await this.usersStore.getFromIndex('User', encodeURI(email));
    console.log('USER: '+JSON.stringify(storedUser1));
    if (storedUser1.error) {
        const tx = this.usersStore.newTransaction();
        tx.putNode(user);
        tx.indexNode(user, encodeURI(email));
        await tx.commit();
        console.log('[register] User created');
        //await this.sendWelcomeMail(email);
        this.requestLogin(cxt, res);
    } else {
      //this.requestLogin(cxt, res);
     console.log('USER: '+JSON.stringify(storedUser1));
     console.log('[register] Email already exists');
      res.status(409, 'Email already exists').send();
      
    }

  }

  async registerRequest(cxt: ServiceContext, res) {
    const { query, body, io } = cxt;
    const { email } = body;    
  }

  async updateUser(cxt: ServiceContext, res) {
    const { query, body, io } = cxt;
    const { email, password } = body;

    console.log("UPDATE USER: "+email);

    let storedUser1 = await this.usersStore.getFromIndex('User', encodeURI(email));

    if (storedUser1.error) {
      res.status(401).send(); 
    }
    else
    {
      console.log('USER: '+JSON.stringify(storedUser1));
   
      const user = {
        kind: 'User',
        id: Hexastore.uuid(),
        email,
        password
      };

      const tx = this.usersStore.newTransaction();
      tx.delNode(storedUser1);
      tx.removeIndex(storedUser1, encodeURI(email));
      tx.putNode(user);
      tx.indexNode(user, encodeURI(email));
      await tx.commit();
      console.log('[UPDATE] User updated');
      res.status(200).send();

    }

  }



  async requestLogin(cxt: ServiceContext, res) {
    const { body } = cxt;
    const { email,password } = body;

    if (!email) {
      res.status(401, 'Wrong Email address').send();
      return;
    }

    this.logUsers();
    
    // Issues a new token

    // check if user exists
    const storedUser = await this.usersStore.getFromIndex('User', encodeURI(email));
    if (storedUser.error) {
      cxt.socketSend(AUTH_STATE, {
        status: false
      });
      res.status(401, 'Unknown Email address').send();
      return;
    }

    if (storedUser.password !== password) {
      cxt.socketSend(AUTH_STATE, {
        status: false
      });
      res.status(403, 'Wrong password').send();
      return;
    }

    // Send token to client
    cxt.socketSend(AUTH_STATE, {
      status: false
    });
    console.log("LOGIN USER: ",{email:storedUser.email});

    res.status(200).send();
  }


  async getPwd(cxt: ServiceContext, res) {
    const { body} = cxt;
    const { email } = body;
   
    if (!email) {
      res.status(401, 'Wrong Email address').send();
      return;
    }

    // check if user exists
    const storedUser = await this.usersStore.getFromIndex('User', encodeURI(email));
    if (storedUser.error) {
     cxt.socketSend(AUTH_STATE, {
       status: false
     });
     res.status(401, 'Unknown Email address').send();
     return;
    }

    console.log('[PWD] Email sent');
    res.status(200).send();
  }

  async logout(cxt: ServiceContext, res) {
    const { tokenData } = cxt;
    await this.clearOneTimeCode(tokenData.email);
    cxt.socketSend(AUTH_STATE, {
      status: false
    });
    res.status(200).send();
  }

  async verifyToken(cxt: ServiceContext, res) {
    const { tokenData } = cxt;
    // Check if authenticated with valid token
    if (!tokenData) {
      console.log('[Verify Token] : invalid');
      cxt.socketSend(AUTH_STATE, {
        status: false
      });
      res.status(401, 'Forbidden').send();
      return;
    } else {
      console.log('[Verify Token] : ok');
      cxt.socketSend(AUTH_STATE, {
        status: true
      });
      res.status(200).send();
    }
  }

  async deleteUser(cxt: ServiceContext, res) {
      const { body } = cxt;
      const { email } = body;

      
      const storedUser = await this.usersStore.getFromIndex('User', encodeURI(email));
      if (!storedUser.error) {
        const tx = this.usersStore.newTransaction();
        tx.delNode(storedUser);
        tx.removeIndex(storedUser, encodeURI(email));
        await tx.commit();
        console.log('[Delete User] : ok');
        this.logout(cxt, res);
      } else {
        console.log('[Delete User] Error');
        res.status(500, 'Server error : user not found').send();
      }
  }


  async authWithCode(cxt: ServiceContext, res) {
    const { body } = cxt;
    const { email, code } = body;

    if (!code || !email) {
      console.log('[Auth with code] Forbidden no code or mail');
      res.status(401, 'Forbidden').send();
      return;
    }
    const authData = await this.oneTimeStore.getNode(`OneTimeCode:${encodeURI(email)}`);
    if (!authData.error) {
      const { date, oneTimeCode, userId } = authData;
      const now = moment();
      const emissionDate = moment(date);
      const age = now.diff(emissionDate, 'minutes');

      
      if ((code === oneTimeCode) && age < MAX_CODE_VALIDITY_IN_MINUTES) {
        const authToken = cxt.newToken({
          email: email,
          userId
        }, '7 days');
        console.log('[Auth with code] Success');

        await this.clearOneTimeCode(email);

        cxt.socketSend(AUTH_STATE, {
          status: true
        });
        res.json({ token: authToken });
      } else {
        console.log('[Auth with code] Forbidden');
        cxt.socketSend(AUTH_STATE, {
          status: false
        });
        res.status(401, 'Forbidden').send();
      }
    } else {
      console.log('[Auth with code] Forbidden');
      cxt.socketSend(AUTH_STATE, {
        status: false
      });
      res.status(401, 'Forbidden').send();
    }
  }

  async clearOneTimeCode(email: string) {
    const tx = this.oneTimeStore.newTransaction();
    tx.delNode(`OneTimeCode:${encodeURI(email)}`);
    await tx.commit();
  }

  getServicesRoutes() {
    return [
      {
        // http://localhost:4001/api/drop-users
        path: '/drop-users',
        method: 'GET',
        action: (cxt: ServiceContext, res) => {
          this.dropUsers(cxt, res);
        }
      },
       {
        // http://localhost:4001/api/register
        path: '/register',
        method: 'POST',
        action: (cxt: ServiceContext, res) => {
          this.registerUser(cxt, res);
        }
      },
      {
       // http://localhost:4001/api/register-request
       path: '/register-request',
       method: 'POST',
       action: (cxt: ServiceContext, res) => {
         this.registerRequest(cxt, res);
       }
      },
      {
        // http://localhost:4001/api/login
        path: '/login',
        method: 'POST',
        action: (cxt: ServiceContext, res) => {
          this.requestLogin(cxt, res);
        }
      },
      {
        // http://localhost:4001/api/logout
        path: '/logout',
        method: 'POST',
        action: (cxt: ServiceContext, res) => {
          this.logout(cxt, res);
        }
      },
      {
        // http://localhost:4001/api/update-user
        path: '/update-user',
        method: 'POST',
        action: (cxt: ServiceContext, res) => {
          this.updateUser(cxt, res);
        }
      },
      {
        // http://localhost:4001/api/get-pwd
        path: '/get-pwd',
        method: 'POST',
        action: (cxt: ServiceContext, res) => {
          this.getPwd(cxt, res);
        }
      },
      {
        // http://localhost:4001/api/auth-code
        path: '/auth-code',
        method: 'POST',
        action: (cxt: ServiceContext, res) => {
          this.authWithCode(cxt, res);
        },
      },
      {
        // http://localhost:4001/api/verify-token
        path: '/verify-token',
        method: 'POST',
        action: (cxt: ServiceContext, res) => {
          this.verifyToken(cxt, res);
        }
      },
      {
        // http://localhost:4001/api/delete-user
        path: '/delete-user',
        method: 'POST',
        action: (cxt: ServiceContext, res) => {
          this.deleteUser(cxt, res);
        }
      },
      {
        // http://localhost:4001/api/get-users
        path: '/get-users',
        method: 'POST',
        action: (cxt: ServiceContext, res) => {
          this.getUsers(cxt, res);
        }
      }
    ]
  }
}



function generateOneTimeCode(length: number) {
  return Array.from(new Array(length), () => {
    return Math.round(Math.random() * 9);
  }).join('');
}