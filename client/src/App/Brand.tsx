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
import { Colors, Bold, ColumnCenter, Link , RowCenter} from '../lib/style';
import { MY_DOMAIN, MY_EXTENSION, MY_VERSION, MY_HEADLINE, MY_HEADLINE_URL } from './Conf';
import GitHubIcon from '@material-ui/icons/GitHub';

type BrandProps = {
}

export const Brand: React.FunctionComponent<BrandProps> = (props) => {
    let { } = props;


    return (
            <ColumnCenter>
                 <div>
                    <Bold>{MY_DOMAIN.toUpperCase()}</Bold><span>.{MY_EXTENSION}</span>
                    <SmallAlpha>&nbsp;<b>{MY_VERSION.toUpperCase()}</b></SmallAlpha>
                </div>
                <Headline>{MY_HEADLINE}</Headline>
                <Headline><RowCenter><GitHubIcon fontSize="small"/>&nbsp;&nbsp;<Link href={MY_HEADLINE_URL} target="_blank"><div><b> <Small>{MY_HEADLINE_URL}</Small></b></div></Link></RowCenter></Headline>
            </ColumnCenter>
    )
}

const SmallAlpha = styled.span`
  font-size:0.5em;
  color: ${Colors.theme};
`

const Small = styled.span`
  font-size:0.8em;
`

const Headline = styled.div`
  font-size:0.6em;
  margin-bottom:5px;
`

export default Brand;