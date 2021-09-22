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

import * as fs from "fs";

export module FileIO {

    export function loadText(textFile) {
        const content = fs.readFileSync(textFile, 'utf8');
        return content;
    }


    export function loadJSONData(jsonFile) {
        try {
            const content = fs.readFileSync(jsonFile, 'utf8');
            const data = JSON.parse(content);
            return data;
        } catch (e) {
            console.log("Error loadJSONData",e)
            return null;
        }
    }

    export function createDirs(path) {
        fs.mkdirSync(path, { recursive: true });
    }

    export async function saveJSONData(path, data, format?: boolean) {
        return new Promise((resolve, reject) => {
            fs.writeFile(path, JSON.stringify(data, null, format ? 2 : 0), 'utf8', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        })

    }

    export async function saveText(path, text) {
        return new Promise((resolve, reject) => {
            fs.writeFile(path, text, 'utf8', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        })

    }

    export function deleteFile(path) {
        try {
            fs.unlinkSync(path);
            return true;
        }catch(e){
            return false;
        }
    }

    export function listFiles(dir) {
        try {
            const files = fs.readdirSync(dir);
            return files;
        }catch(e){
            return [];
        }
    }

    export function exists(file) {
        return fs.existsSync(file);
    }
}