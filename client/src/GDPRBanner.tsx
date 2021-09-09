import * as React from 'react'
import styled from 'styled-components'

type GDPRBannerProps = {
}

export const GDPRBanner: React.FunctionComponent<GDPRBannerProps> = (props) => {
  const [Gdpr,setGDPR] = React.useState(false);
  function closeGDPR()
  {
    localStorage.setItem('GDPR', 'true');
    setGDPR(false);
  }
  React.useEffect(() => {
    setGDPR(localStorage.getItem('GDPR')!=="true");
  }, []);

    return <div>
      {Gdpr && <Canvas>
        <Row>
       <div>This website uses cookies to offer you the best experience of our services. By using this website you agree to our privacy policy!</div>
       <Button onClick={closeGDPR}><b>ACCEPT</b></Button>
     </Row>
   </Canvas>}
 </div>
}

//We use optional third-party analytics cookies to understand how you use GitHub.com so we can build better products.


const Button = styled.div`
  padding:10px 20px 10px 20px;
  background-color: rgb(73, 214, 249);
  text-align: center;
  color: #282c34;
  margin-left: 10px;
  margin-right: 30px;
  border-radius: 8px;
  cursor: pointer;
  transition: all .1s ease-in-out;
  &:hover{
       transform: scale(1.1);
       background-color: rgb(255, 225, 95);
     }
`

const Canvas = styled.div`
  position:fixed;
  bottom:0px;
  left:0px;
  padding:20px;
  background-color: rgb(255,255,255);
  text-align: center;
  color: #282c34;
  font-size: 1em;
  z-index:9000;
  width:100%;
  @media (max-width: 1280px) {
      font-size: 0.8em;
  }
  @media (max-width: 760px) {
      font-size: 0.7em;
  }
`

const Row = styled.div`
  position:relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width:100%;
`
