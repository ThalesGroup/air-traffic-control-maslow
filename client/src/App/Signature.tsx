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