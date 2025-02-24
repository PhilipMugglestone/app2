const cds = require('@sap/cds');
const debug = require('debug')('srv:catalog-service');

module.exports = cds.service.impl(async function () {

    const s4hcso = await cds.connect.to('API_SALES_ORDER_SRV');
    const em = await cds.connect.to('messaging');
    const db = await cds.connect.to('db');

    const {
        Sales
        ,
        SalesOrders
        ,
        SalesOrdersLog
    } = this.entities;

    this.after('READ', Sales, (each) => {
        if (each.amount > 500) {
            each.criticality = 3;
            if (each.comments === null)
                each.comments = '';
            else
                each.comments += ' ';
            each.comments += 'Exceptional!';
            debug(each.comments, { "country": each.country, "amount": each.amount });
        } else if (each.amount < 150) {
            each.criticality = 1;
        } else {
            each.criticality = 2;
        }
    });

    this.on('boost', Sales, async req => {
        try {
            const ID = req.params[0];
            const tx = cds.tx(req);
            await tx.update(Sales)
                .with({ amount: { '+=': 250 }, comments: 'Boosted!' })
                .where({ ID: { '=': ID } })
                ;
            debug('Boosted ID:', ID);
            em.tx(req).emit('sap/sha/demo/app2/topic/boost', { "ID": ID });
            const cs = await cds.connect.to('CatalogService');
            let results = await cs.read(SELECT.from(Sales, ID));
            return results;
        } catch (err) {
            req.reject(err);
        }
    });

    em.on('sap/sha/demo/app2/topic/boost', async msg => {
        debug('Event Mesh: Boost:', msg.data);
        try {
            await db.run(
                UPDATE(Sales).with({ comments: 'Boosted! Mesh!' }).where({ ID: { '=': msg.data.ID } })
            );
        } catch (err) {
            console.error(err);
        }
    });

    em.on('sap/S4HANAOD/sha1/ce/sap/s4/beh/salesorder/v1/SalesOrder/Changed/v1', async msg => {
        debug('Event Mesh: SalesOrder Changed msg:', msg.data);
        try {
            const cql = SELECT.one(SalesOrders).where({ SalesOrder: msg.data.SalesOrder });
            const tx = s4hcso.transaction(msg);
            const res = await tx.send({
                query: cql
            });
            debug('Event Mesh: SalesOrder Changed res:', res);
            await db.run(
                INSERT.into(SalesOrdersLog).entries({ salesOrder: msg.data.SalesOrder, incotermsLocation1: res.IncotermsLocation1 })
            );
        } catch (err) {
            console.error(err);
            return {};
        }
    });

    this.on('topSales', async (req) => {
        try {
            const tx = cds.tx(req);
            const results = await tx.run(`CALL "APP2_DB_SP_TopSales"(?,?)`, [req.data.amount]);
            return results.RESULT;
        } catch (err) {
            req.reject(err);
        }
    });

    this.on('READ', SalesOrders, async (req) => {
        try {
            const tx = s4hcso.transaction(req);
            return await tx.send({
                query: req.query
            })
        } catch (err) {
            req.reject(err);
        }
    });

    this.on('largestOrder', Sales, async (req) => {
        try {
            const tx1 = cds.tx(req);
            const res1 = await tx1.read(Sales)
                .where({ ID: { '=': req.params[0] } })
                ;
            let cql = SELECT.one(SalesOrders).where({ SalesOrganization: res1[0].org }).orderBy({ TotalNetAmount: 'desc' });
            const tx2 = s4hcso.transaction(req);
            const res2 = await tx2.send({
                query: cql
            });
            if (res2) {
                return res2.SoldToParty + ' @ ' + res2.TransactionCurrency + ' ' + Math.round(res2.TotalNetAmount).toString();
            } else {
                return 'Not found';
            }
        } catch (err) {
            req.reject(err);
        }
    });

    this.on('userInfo', req => {
        let results = {};
        results.user = cds.context.user.id;
        results.locale = cds.context.locale;
        results.scopes = {};
        results.scopes.identified = req.user.is('identified-user');
        results.scopes.authenticated = req.user.is('authenticated-user');
        results.scopes.Viewer = req.user.is('Viewer');
        results.scopes.Admin = req.user.is('Admin');
        em.tx(req).emit('sap/sha/demo/app2/topic/user', results);
        return results;
    });

    em.on('sap/sha/demo/app2/topic/user', async msg => {
        debug('Event Mesh: User:', msg.data);
    });

});