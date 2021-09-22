
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

 import levelup from 'levelup';
import encode from 'encoding-down';
import fs from 'fs'

const DEFAULT_PATH = './hexastore/db'

export class Hexastore {

    db: any;

    constructor(storage, path?: string) {
        const dbPath = path ? path : DEFAULT_PATH;
        fs.mkdirSync(dbPath, { recursive: true });
        var customEncoding = {
            encode: JSON.stringify,
            decode: JSON.parse,
            buffer: false,
            type: 'custom'
        }

        const options = {
            keyEncoding: customEncoding,
            valueEncoding: customEncoding,
            keyAsBuffer: false,
            valueAsBuffer: false
        }
        this.db = levelup(encode(storage(dbPath), options))
    }

    async getAllKeys() {
        return this.query({
            keys: true, values: false
        });
    }

    async getNodeByKind(kind: string, id: string) {
        return this.getNode(`${kind}:${id}`);
    }

    async getNode(key: string) {
        try {
            const data = await this.db.get(key);
            return data;
        } catch (e) {
            return {
                error: e,
                key
            };
        }
    }

    async getNodes(keys: string[]) {
        const results = [];
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            try {
                const value = await this.getNode(key);
                results.push(value);
            } catch (e) {
                results.push({
                    error: e,
                    key
                });
            }
        }
        return results;
    }

    async getFromIndex(kind: string, key: string) {
        const indexkey = `index:${kind}:${key}`;
        const value = await this.getNode(indexkey);
        if (!value.error) {
            const { id } = value;
            return this.getNode(id);
        }
        return value;
    }

    async getTargets(nodeOrKey: Node | string, predicate?: string) {
        const key = Hexastore.nodeKey(nodeOrKey);

        const sourceKey = `${LinkDirection.SourcePredicateTarget}:${key}`;
        const keyQuery = predicate ? `${sourceKey}:${predicate}` : sourceKey;
        const links = await this.getKeyRange(keyQuery);
        const orderedLinks = links
            .sort((a, b) => {
                return a.value.order - b.value.order;
            });
        const targetKeys = orderedLinks.map(link => {
            return link.value.target
        });
        return this.getNodes(targetKeys);
    }

    async getSources(nodeOrKey: Node | string, predicate?: string) {
        const key = Hexastore.nodeKey(nodeOrKey);

        const targetKey = `${LinkDirection.TargetPredicateSource}:${key}`;
        const keyQuery = predicate ? `${targetKey}:${predicate}` : targetKey;
        const links = await this.getKeyRange(keyQuery);
        const orderedLinks = links
            .sort((a, b) => {
                return a.value.order - b.value.order;
            });

        const sourceKeys = orderedLinks.map(link => {
            return link.value.source
        });
        return this.getNodes(sourceKeys);
    }

    async getLinks(sourceNodeOrKey: Node | string, targetNodeOrKey: Node | string) {
        const sourceKey = Hexastore.nodeKey(sourceNodeOrKey);
        const targetKey = Hexastore.nodeKey(targetNodeOrKey);

        const forwardQuery = `${LinkDirection.SourceTargetPredicate}:${sourceKey}:${targetKey}`;
        const reverseQuery = `${LinkDirection.SourceTargetPredicate}:${targetKey}:${sourceKey}`;

        const forwardLinks = await this.getKeyRange(forwardQuery);
        const reverseLinks = await this.getKeyRange(reverseQuery);
        const allLinks = [].concat(forwardLinks, reverseLinks);
        return allLinks.map(link => link.value);
    }

    async getNodeLinks(nodeOrKey: Node | string) {
        const key = Hexastore.nodeKey(nodeOrKey);
        const forwardQuery = `${LinkDirection.SourceTargetPredicate}:${key}`;
        const reverseQuery = `${LinkDirection.TargetSourcePredicate}:${key}`;
        const forwardLinks = await this.getKeyRange(forwardQuery);
        const reverseLinks = await this.getKeyRange(reverseQuery);
        const allLinks = [].concat(forwardLinks, reverseLinks);
        return allLinks.map(link => link.value);
    }

    async getNodesKeysByKind(kind: string) {
        const actions = await this.getKeyRange(`${kind}:`);
        return actions.map((entry) => {
            return entry.key;
        });
    }

    async getNodesByKind(kind: string) {
        const actions = await this.getKeyRange(`${kind}:`);
        return actions.map((entry) => {
            return entry.value;
        });
    }

    async getKeysFromRange(start: string, end?: string) {
        const endKey = end ? end : start;
        return await this.query({
            gte: `${start}`,
            lte: `${endKey}\xff`,
            values: false
        });
    }

    async drop() {
        return await this.db.clear();
    }

    async close() {
        return this.db.close();
    }

    async getKeyRange(start: string, end?: string) {
        const endKey = end ? end : start;
        return await this.query({
            gte: `${start}`,
            lte: `${endKey}\xff`
        });
    }

    newTransaction(): Transaction {
        return new Transaction(this);
    }

    // options 
    // gt, gte, lt, lte, reverse, limit, keys:boolean, values: boolean
    async query(options?) {
        return new Promise<any[]>((resolve, reject) => {
            const results = [];
            this.db.createReadStream(options)
                .on('data', function (data) {
                    // console.log(data.key, '=', data.value);
                    results.push(data)
                })
                .on('error', function (err) {
                    // console.log('Oh my!', err)
                    reject(err);
                })
                .on('close', function () {
                    // console.log('Stream closed')
                })
                .on('end', function () {
                    // console.log('Stream ended')
                    resolve(results);
                })
        })
    }


    static uuid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        };
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    static nodeKey(nodeOrKey: Node | string) {
        const key = typeof nodeOrKey === 'string' ? nodeOrKey : `${nodeOrKey.kind}:${nodeOrKey.id}`;
        return key;
    }
}

export class Transaction {

    operations: Operation[] = [];

    constructor(private store: Hexastore) {

    }

    async commit() {
        await this.store.db.batch(this.operations);
    }

    putNode(node: Node) {
        const key = Hexastore.nodeKey(node);
        this.put(key, node)
        return key;
    }

    updateNode(node: Node) {
        const key = Hexastore.nodeKey(node);
        this.update(key, node)
        return key;
    }

    indexNode(node: Node, key: string) {
        const indexkey = `index:${node.kind}:${key}`;
        this.put(indexkey, {
            id: Hexastore.nodeKey(node)
        });
        return key;
    }
    
    removeIndex(node: Node, key: string) {
        const indexKey = `index:${node.kind}:${key}`;
        this.del(indexKey);
        return key;
    }

    async delNode(nodeOrKey: Node | string, ...deletePredicates: string[]) {
        this.del(nodeOrKey)
        const links = await this.store.getNodeLinks(nodeOrKey);

        const tx = this.store.newTransaction();
        links.forEach(link => {
            const linkKeys = Transaction.createLinkKeys(link);
            linkKeys.forEach(key => {
                tx.del(key);
            });
        });
        await tx.commit();

        const sourceKey = Hexastore.nodeKey(nodeOrKey);

        const deleteTargets = deletePredicates ? links.filter(link => {
            return deletePredicates.includes(link.predicate) && link.source === sourceKey;
        }) : [];

        for (let index = 0; index < deleteTargets.length; index++) {
            const target = deleteTargets[index].target;
            await this.delNode(target, ...deletePredicates);
        }

        return links;

    }

    link(source: Node, target: Node, predicate: string, order?: number) {
        const sourceKey = Hexastore.nodeKey(source);
        const targetKey = Hexastore.nodeKey(target);
        const link = {
            source: sourceKey,
            target: targetKey,
            predicate,
            order: order ? order : 0
        }
        const linkKeys = Transaction.createLinkKeys(link);

        linkKeys.forEach(key => {
            this.put(key, link);
        });
    }

    async unlink(source: Node, target: Node, predicate?: string) {
        const sourceKey = Hexastore.nodeKey(source);
        const targetKey = Hexastore.nodeKey(target);

        if (predicate) {
            const link = {
                source: sourceKey,
                target: targetKey,
                predicate
            }
            const linkKeys = Transaction.createLinkKeys(link);

            linkKeys.forEach(key => {
                this.del(key);
            });
        } else {
            const links = await this.store.getLinks(source, target);
            links.forEach(link => {
                const linkKeys = Transaction.createLinkKeys(link);

                linkKeys.forEach(key => {
                    this.del(key);
                });
            });
        }
    }

    private put(key: string, value: any) {
        this.operations.push({
            type: 'put',
            key,
            value
        });
    }

    private update(key: string, value: any) {
        this.operations.push({
            type: 'update',
            key,
            value
        });
    }

    private del(nodeOrKey: Node | string) {
        const key = Hexastore.nodeKey(nodeOrKey);
        this.operations.push({
            type: 'del',
            key
        });
    }

    static createLinkKeys(link: Link) {
        const { source, target, predicate } = link;
        const sourceId = `${source}`;
        const targetId = `${target}`;
        const predicateId = `${encodeURI(predicate)}`;

        const spt = `${LinkDirection.SourcePredicateTarget}:${sourceId}:${predicateId}:${targetId}`;
        const tps = `${LinkDirection.TargetPredicateSource}:${targetId}:${predicateId}:${sourceId}`;
        const tsp = `${LinkDirection.TargetSourcePredicate}:${targetId}:${sourceId}:${predicateId}`;
        const stp = `${LinkDirection.SourceTargetPredicate}:${sourceId}:${targetId}:${predicateId}`;
        const pts = `${LinkDirection.PredicateTargetSource}:${predicateId}:${targetId}:${sourceId}`;
        const pst = `${LinkDirection.PredicateSourceTarget}:${predicateId}:${sourceId}:${targetId}`;
        return [spt, tps, tsp, stp, pts, pst]
    }

}

export interface Node {
    id?: string,
    kind: string
}

export type Operation = {
    type: string,
    key: string,
    value?: any
};


export interface Link {
    source: string,
    target: string,
    predicate: string,
    order?: number
}

export enum LinkDirection {
    SourcePredicateTarget = 'HxSLink:spt',
    TargetPredicateSource = 'HxSLink:tps',
    TargetSourcePredicate = 'HxSLink:tsp',
    SourceTargetPredicate = 'HxSLink:stp',
    PredicateTargetSource = 'HxSLink:pts',
    PredicateSourceTarget = 'HxSLink:pst'
}