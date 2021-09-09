import * as React from 'react';
import styled from 'styled-components';
import {  Button } from '../lib/style';
import { InputBase } from '@material-ui/core';

type TextInputProps = {
    question?: string,
    description?: string,
    placeholder?:string,
    answer: string,
    setAnswer?: (index: string) => void,
    reset?:Boolean,
    slim?:Boolean,
    button?:string,
    row?:boolean
};


export const TextInput: React.FunctionComponent<TextInputProps> = (props) => {
    let { question, description, placeholder, answer, setAnswer, reset, slim, button,row } = props;

    const [filter, setFilter] = React.useState(answer);

    React.useEffect(() => {
        setFilter(answer);
      }, [answer]);

    const updateFilter = (e) => {
        if (button)
            setFilter(e.target.value);
        else
            setAnswer(e.target.value);
    }

    const keyPress = async (e) => {
        //ENTER PRESSED
        if (!button && e.keyCode == 13) {
            setAnswer(filter);
            if (reset)
                setFilter("");
        }
    }

    const onValidate =  () => {
        setAnswer(filter);
        if (reset)
            setFilter("");
    }

    return (
        <Container row={row}>
        {question && <Title slim={slim}>{question}</Title>}
            {description && <div>{description}</div>}
               <div><InputBase
                    placeholder={placeholder?placeholder:"Type answer here..."}
                    inputProps={{ 'aria-label': 'Tags', style: { fontSize:`0.7em`,lineHeight:`1.5em`,width:`100%`, padding:'10px',borderRadius: `24px`,backgroundColor:`rgba(255,255,255,0.8)`}}}
                    value={filter}
                    onChange={updateFilter}
                    fullWidth={true}
                    autoFocus
                    multiline
                    onKeyDown={keyPress}
                /></div> 
                {button && <Button onClick={onValidate}><b>{button}</b></Button>}
        </Container>
        )
}

const Title = styled.div`
    font-size: ${props => props.slim ? `0.9em` : `1.5em`};
    font-weight:900;
    margin-right:10px;
    text-align:center;
`

const Container = styled.div`
    position:relative;
    width:100%;
    font-weight:700;
    display:flex;
    flex-direction:${props => props.row ? `row` : `column`};
    justify-content:center;
    align-items:center;
`

export default TextInput;