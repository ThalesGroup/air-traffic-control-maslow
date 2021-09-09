import styled from 'styled-components';
import { withStyles, makeStyles } from '@material-ui/core/styles';
import Slider from '@material-ui/core/Slider';
import Radio from '@material-ui/core/Radio';

export const Colors= {
  cyan: 'rgb(0,255,255)',
  front: '#FFFFFF',
  back: '#111',
  frontLight: '#F5F5F5',
  backLight: '#333',
  grey: '#555',
  theme: 'rgb(73, 214, 249)',
  themeDark: 'rgb(7, 172, 213)',
  yellow: 'rgb(255,255,0)',
  green: 'rgb(0,255,0)',
  orange: 'rgb(255,165,0)',
  blue: '#2196f3'
}

export const Grey = styled.div `
color:${Colors.grey};
`

export const BackContainer = styled.div`
position:fixed;
width:100%;
height:100%;
z-index:1000;
background-color: ${props => props.color ? props.color : 'rgba(0,0,0,0.2)'};
display: flex;
flex-direction:column;
justify-content: center; /* align horizontal */
align-items: center; /* align vertical */
z-index:5000;
top:0px;
left:0px;
`

export const Small = styled.span`
font-size:0.8em;
`

export const Bold = styled.span`
font-weight:700;
`

export const Normal = styled.span`
font-weight:400;
`

export const Light = styled.span`
font-weight:200;
`

export const Clickable = styled.div`
cursor:pointer;
`

export const Circle = styled.div`
background-color: ${props => props.selected?(props.color ? props.color : `${Colors.green}`):''};
border: ${props =>  props.selected?'':(props.color ? '1px solid '+props.color : '1px solid '+`${Colors.themeDark}`)};
border-radius: 50%;
width:6px;
height:6px;
`

export const ColumnCenter = styled.section`
position: relative;
display:flex;
flex-direction:column;
justify-content:center;
align-items:center;
`

export const RowCenter = styled.section`
position: relative;
display:flex;
flex-direction:row;
justify-content:center;
align-items:center;
`

export const RowSpace = styled.section`
position: relative;
display:flex;
flex-direction:row;
justify-content: space-between;
align-items: start;
`

export const RowRight = styled.section`
position: relative;
display:flex;
flex-direction:row-reverse;
justify-content:start;
align-items:start;
flex-wrap: wrap;
`

export const ColumnLeft = styled.section`
position: relative;
display:flex;
flex-direction:column;
justify-content:start;
align-items:start;
width:100%;
`

export const ColumnRight = styled.section`
position: relative;
display:flex;
flex-direction:column;
justify-content:space-between;
align-items:end;
`

export const RowLeft = styled.section`
position: relative;
display:flex;
flex-direction:row;
justify-content:start;
align-items:start;
`

export const Toggle = styled.div`
opacity: ${props => props.selected ? '1' : '0.7'};
cursor:pointer;
font-weight: ${props => props.selected ? 900 : 400};
margin-right:5px;
`

export const Button = styled.div`
background-color: ${props => props.outline ? 'none' : (props.backgroundColor ? props.backgroundColor :`${Colors.themeDark}`)};
display: block;
position:relative;
padding:${props => props.sharp ? '15px 20px 15px 20px' : '20px 30px 20px 30px'};
line-height:0em;
text-align: center;
color: ${props => props.outline ? (props.backgroundColor ? props.backgroundColor :`${Colors.front}`) : `#FFFFFF`};
font-size: ${props => props.size ? props.size : '1em'};
font-weight: 400;
border: ${props => props.outline ? (props.backgroundColor ? '1px solid '+props.backgroundColor : '1px solid '+`${Colors.front}`) : 'none'};
margin: 5px;
overflow: visible;
cursor:pointer;
vertical-align:middle;
opacity: 0.9;
border-radius: 4px;
&:hover {
      background-color: ${props => props.outline ? 'none' : `${Colors.theme}`};
      &:before {
        width: 100%;
      }
}
`

export const Link = styled.a`
position:relative;
text-decoration: underline;
cursor: pointer;
color:${props => props.color ? props.color : 'white'};
line-height:0em;
font-size:1em;
@media (max-width: 760px) {
  font-size:0.8em;
}
`

export const Red = styled.div`
color: rgba(255,0,0,100);
`

export const Green = styled.div`
color: rgba(0,255,0,100);
`

export const Error = styled.div`
color:red;
margin-top:20px;
`

export const MySlider = withStyles({
    root: {
      color: 'white',
    },
  })(Slider);

export const MyBlueSlider = withStyles({
    root: {
      color: Colors.theme,
    },
    valueLabel: {
      top: 0,
      left: -35,
      fontWeight:900,
      '& *': {
        background: 'transparent',
        color: '#FFF',
      },
    },

  })(Slider);

export const MyRadio = withStyles({
    root: {
      color: "#DDD",
      '&$checked': {
        color: "#FFF",
      },
    },
    checked: {},
  })(Radio);

