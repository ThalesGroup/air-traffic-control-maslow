import * as React from 'react';
import styled from 'styled-components';
import '../lib/effect.css';
import { Colors, Link, RowCenter } from '../lib/style';
import {  MY_FOOTER_URL, MY_FOOTER } from './Conf';
import FavoriteIcon from '@material-ui/icons/Favorite';


type SignatureProps = {
}

export const Signature: React.FunctionComponent<SignatureProps> = (props) => {
    let { } = props;

    return (
        <Container>
            <RowCenter><FavoriteIcon fontSize="small" color="secondary" className="heartbeat"/>&nbsp;<Link color={Colors.theme} href={MY_FOOTER_URL} target="_blank"><b>{MY_FOOTER}</b></Link></RowCenter>
        </Container>
    )
}

const Container = styled.div`
position:absolute;
bottom:20px;
right:20px;
margin-top:40px;
font-size:0.7em;
`

export default Signature;