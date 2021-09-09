import { expect } from '../Expect'
import { Hexastore } from './Hexastore'

import leveldown from "leveldown";

enum NodeKind {
    DemoNode = 'DemoNode',
    ParentNode = 'ParentNode',
    ChildNode = 'ChildNode'
}

enum Predicate {
    Child = 'Child',
    RelatesTo = 'RelatesTo'
}

describe('Hexastore', () => {

    let store: Hexastore = null;

    const data = {
        kind: NodeKind.DemoNode,
        id: Hexastore.uuid(),
        value: 'Test Node'
    };

    const parent = {
        kind: NodeKind.ParentNode,
        id: Hexastore.uuid(),
        value: 'Parent Node'
    };

    const children = Array.from(new Array(10), (obj, index) => {
        return {
            kind: NodeKind.ChildNode,
            id: Hexastore.uuid(),
            value: `Child #${index}`
        };
    });

    const relatesTo = Array.from(new Array(5), (obj, index) => {
        return {
            kind: NodeKind.DemoNode,
            id: Hexastore.uuid(),
            value: `Relation #${index}`
        };
    });


    const dataKey = Hexastore.nodeKey(data);

    before(() => {
        store = new Hexastore(leveldown, './test-data/output/hexastore/demo');
        console.log('Hexastore opened');
    })

    after(async () => {
        await store.drop();
        await store.close();
        console.log('Hexastore closed');
    })

    it('Should create the datastore', async () => {
        const tx = store.newTransaction();

        const key = tx.putNode(data);
        console.log(key);

        await tx.commit();

        expect(key).to.shallowDeepEqual(dataKey);
    })

    it('Should load saved data', async () => {
        const loadedData = await store.getNode(dataKey);
        expect(loadedData).to.shallowDeepEqual(data);
    });

    it('Should get all object of kind DemoNode', async () => {
        const nodes = await store.getNodesByKind(NodeKind.DemoNode);
        // console.log(nodes);
        expect(nodes.length).to.equal(1);
    });

    it('Should add child nodes and link to parent', async () => {
        const tx = store.newTransaction();

        tx.putNode(parent);

        children.forEach((child, order) => {
            tx.putNode(child);
            tx.link(parent, child, Predicate.Child, order);
        });

        relatesTo.forEach((relation) => {
            tx.putNode(relation);
            tx.link(parent, relation, Predicate.RelatesTo);
        })

        await tx.commit();
    });

    it('Should get all keys in db', async () => {
        const allKeys = await store.getAllKeys();
        const keysCount = 1 + 1 + children.length
            + children.length * 6 // parent -> children - links
            + relatesTo.length
            + relatesTo.length * 6; // parent -> relatesTo - links
        
        expect(allKeys.length).to.equals(keysCount);
    })


    it('Should get all Child predicates for parent node', async () => {
        const targets = await store.getTargets(parent, Predicate.Child);
        // console.log(targets);
        expect(targets).to.shallowDeepEqual(children);
    });

    it('Should get all RelatesTo predicates for parent node', async () => {
        const targets = await store.getTargets(parent, Predicate.RelatesTo);
        // console.log(targets);
        expect(targets.length).to.equals(relatesTo.length);
    });

    it('Should get all links from parent node', async () => {
        const targets = await store.getTargets(parent);
        // console.log(targets);
        expect(targets.length).to.equals(children.length + relatesTo.length);

        const links = await store.getNodeLinks(parent);
        expect(links.length).to.equals(children.length + relatesTo.length);
    });


    it('Should get all links from child node', async () => {
        const sources = await store.getSources(children[0]);
        // console.log(sources);
        expect(sources).to.shallowDeepEqual([parent]);
    });

    it('Should delete link from parent to first child node', async () => {
        const tx = store.newTransaction();
        await tx.unlink(parent, children[0], Predicate.Child);
        await tx.commit();

        const targets = await store.getTargets(parent, Predicate.Child);
        // console.log(targets);
        expect(targets).to.shallowDeepEqual(children.slice(1, children.length));
    });

    it('Should delete parent and all associated links', async () => {
        const setupTx = store.newTransaction();
        await setupTx.link(children[1], children[0], Predicate.Child);
        await setupTx.link(children[1], data, Predicate.RelatesTo);
        await setupTx.commit();

        const datalinksSetup = await store.getNodeLinks(Hexastore.nodeKey(data));
        expect(datalinksSetup).to.be.not.empty;

        const tx = store.newTransaction();
        // Delete node and related Child predicates
        const deletedLinks = await tx.delNode(parent, Predicate.Child);
        expect(deletedLinks.length).to
            .equals(children.length + relatesTo.length - 1);
        await tx.commit();

        const loadedParent = await store.getNode(Hexastore.nodeKey(parent));
        // console.log(loadedData);
        expect(loadedParent.error).not.to.be.null;

        const links = await store.getNodeLinks(Hexastore.nodeKey(parent));
        expect(links).to.be.empty;

        const nodes = await store.getNodesByKind(NodeKind.ChildNode);
        expect(nodes).to.be.empty;

        const datalinks = await store.getNodeLinks(Hexastore.nodeKey(data));
        expect(datalinks).to.be.empty;

        const loadedData = await store.getNode(Hexastore.nodeKey(data));
        // console.log(loadedData);
        expect(loadedData).to.shallowDeepEqual(data);
    });


})