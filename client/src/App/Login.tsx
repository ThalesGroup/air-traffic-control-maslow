import * as React from 'react';
import styled from 'styled-components';
import { InputBase } from '@material-ui/core';
import { RowCenter, BackContainer, Button, Link } from 'lib/style';
import { Brand } from './Brand';
import { ReactiveCoreClient } from '../ext/rx-core-client/ReactiveCoreClient';
import CloseIcon from '@material-ui/icons/HighlightOff';
import LogoutIcon from '@material-ui/icons/ExitToApp';
import AccountIcon from '@material-ui/icons/AccountCircle';
import { capitalizeAll } from 'lib/utils';
import WaitIcon from '@material-ui/icons/Loop';


const rxClient = new ReactiveCoreClient('/', {
  data: ['Auth']
});

type LoginProps = {
  email: string,
  setEmail?: (item: any) => void,
  password: string,
  setPassword?: (item: any) => void,
  open: boolean,
  setOpen?: (item: any) => void,
}

export const Login: React.FunctionComponent<LoginProps> = (props) => {

  let { email, setEmail, password, setPassword, open, setOpen } = props;
  const DEBUG = window.location.href.indexOf(':2002')>0;

  const [error, setError] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [isWaitingLogin, setIsWaitingLogin] = React.useState(false);
  const [isWaitingRegister, setIsWaitingRegister] = React.useState(false);
  const [isLogged, setIsLogged] = React.useState(false);
 
  React.useEffect(() => {   
    if (email.length===0)
    {
      let localEmail = localStorage.getItem('ml');
      let localPwd = localStorage.getItem('pss');
    
      if (localEmail)
        setEmail(localEmail);
      if (localPwd)
        setPassword(localPwd);

      if (localEmail && localPwd) {
        login(localEmail,localPwd);
     
    }
    else
    {
      setIsLogged(false);
    }

    }

  }, []);

  const logout = () => {
    if (isLogged) {
      setLogged(false, "", "");
      setEmail("");
      setPassword("");
      setError("");
      setStatus("");
      setOpen(true);
    }
  }
  
  const updateEmail = (e) => {
    setEmail(e.target.value.toLowerCase());
  }

  const updatePassword = (e) => {
    setPassword(e.target.value.toLowerCase());
  }

  const setLoginError = (e) => {
    console.log("Login Error: " + JSON.stringify(e));
    setStatus("");
    setError("");
    if (e.status === 406) {
      setError("Knickname already exists");
    }
    else if (e.status === 409) {
      setError("Email address already exists");
    }
    else if (e.status === 401) {
      setError("Unknown Email address");
    }
    else if (e.status === 403) {
      setError("Wrong Password");
    }
  }

  const setLogged = (logged, email, password) => {
    if (logged) {
      localStorage.setItem('ml', email);
      localStorage.setItem('pss', password);
    }
    else {
      localStorage.setItem('ml', "");
      localStorage.setItem('pss', "");
    }
    setIsLogged(logged);
  }

  const register = async () => {
    setError("");
    setStatus("");
      
    if (email.length === 0)
      setError("Please enter your Email address")
    else if (email.indexOf("@") < 0)
      setError("Wrong Email address")
     else if (password.length === 0)
      setError("Please enter a Password")
    else {
      setError("");
      setStatus("");
      setIsWaitingRegister(true);
      try {
        await rxClient.register(email, password);
        setIsWaitingRegister(false);
        setLogged(true, email, password);
        setOpen(false);
      }
      catch (e) {
        setIsWaitingRegister(false);
        console.log("Error: ",e);
      }
    }
  }

  const update = async () => {
    if (email.length === 0)
      setError("Please enter your Email address")
    else if (email.indexOf("@") < 0)
      setError("Wrong Email address")
     else if (password.length === 0)
      setError("Please enter a Password")
    else {
      setError("");
      try {
        await rxClient.updateAccount(email, password);

        setLogged(true, email, password);
        setOpen(false);
      }
      catch (e) {
        console.log("Error: ",e);
      }
    }
  }

  const onLogin = () => {
    login(email,password);
  }
 
 
  const login = async (myEmail,myPassword) => {
    setError("");
    setStatus("");
     
    if (myEmail.length === 0)
      setError("Please enter your Email address")
    else if (myEmail.indexOf("@") < 0)
      setError("Wrong Email address")
    else {
      try {
        setIsWaitingLogin(true);
      
        let result = await rxClient.login(myEmail, myPassword,!DEBUG);
       
        if (result && result.error)
        {
          setLoginError(result.error);
        }
        else
        {
          setLogged(true, myEmail, myPassword);
          setOpen(false);    
        }
        setIsWaitingLogin(false);
      }
      catch (e) {
        console.log("Error: ",e);
        setIsWaitingLogin(false);
      }
    }
  }

  const onClose = () => {
    setOpen(false);
  }

  const onAccount = () => {
    setOpen(true);
  }

  const deleteUser = async () => {
    try {
      setError("");
    setStatus("");

      if (email.length === 0)
        setError("Please enter your Email address")
      else {
        let result = await rxClient.deleteAccount(email);
        console.log("Register: " + JSON.stringify(result));
      }
    }
    catch (e) {
      console.log("Login Error: " + JSON.stringify(e));
      if (e.status === 409) {
        setError("Email address already exists");
      }
    }
  }


  const clearUsersDB = () => {
    rxClient.dropUsers();
  }

  return (
    <div>
      {open ? <BackContainer>
        <Container>
          {isLogged && <Close onClick={onClose}><u><CloseIcon/></u></Close>}
          <BrandContainer><Brand/></BrandContainer>
          <InputText
            placeholder="Email..."
            value={email}
            onChange={updateEmail} />
          <InputText
            type="password"
            placeholder="Password..."
            value={password}
            onChange={updatePassword} />
        
          {error.length > 0 && <Error>{error.toUpperCase()}</Error>}
          {status.length > 0 && <Info>{status.toUpperCase()}</Info>}

          {isLogged && <Button onClick={update}>Update</Button>}
          {!isLogged && <Button onClick={onLogin}>
          <RowCenter><div>Login</div>&nbsp;{isWaitingLogin && <WaitIcon className="rotating"/>}</RowCenter>
        </Button>}

        <div>
            {isLogged ? 
            <Alternative onClick={logout}><u>Logout</u></Alternative> :
            <Alternative onClick={register}><u>Register</u>&nbsp;{isWaitingRegister && <WaitIcon className="rotating"/>}</Alternative>}       
        </div>

         </Container>
      </BackContainer>
      : 
      <Logout>
          <Alternative onClick={onAccount}><RowCenter><AccountIcon/>&nbsp;<div>{email}</div></RowCenter></Alternative>
      </Logout>}

    </div>
  );
}



const Container = styled.div`
display: flex;
flex-direction:column;
position:absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
color:white;
background-color:rgba(0,0,0,0.6);
align-items: center;
justify-content: center;
text-align:center;
width:460px; 
@media (max-width: 400px) {
  width:80%;
}
padding:50px 50px 10px 50px;
border-radius:24px;
`

const BrandContainer = styled.div`
font-size:1.6em;
color:white;
margin-bottom:40px;
`

const InputText = styled(InputBase)`
width:90%;
background-color: rgba(255,255,255,0.8);
border-radius:4px;
height:50px;
margin-bottom:20px;
justify-content:center;
padding:20px;
`

const Small = styled.div`
font-size:11px;
color:white;
margin-bottom:20px;
margin-top:-10px;
cursor:pointer;
`

const Alternative = styled.div`
margin-top: 5px;
color:white;
cursor:pointer;
font-size: 0.8em;
`


const Logout = styled.div`
position:fixed;
top:10px;
right:20px;
`

const Error = styled.div`
color:red;
font-size:1.4em,
font-weight: 900;
margin:10px;
`

const Info = styled.div`
color:white;
font-size:1.4em,
font-weight: 900;
margin:10px;
`

const Close = styled.div`
position:absolute;
top:20px;
right:20px;
color:white;
cursor:pointer;
`

const Footer = styled.div`
margin-top:20px;
`

export default Login;