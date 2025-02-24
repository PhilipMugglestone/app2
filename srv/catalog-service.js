const cds = require('@sap/cds');
const debug = require('debug')('srv:catalog-service');

module.exports = cds.service.impl(async function () {

    const s4hcso = await cds.connect.to('API_SALES_ORDER_SRV');
    const em = await cds.connect.to('messaging');
    const db = await cds.connect.to('db');

    const {
        SalesOrders
        ,
        SalesOrdersLog
    } = this.entities;

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

    em.on('sap/S4HANAOD/s4h7/ce/sap/s4/beh/salesorder/v1/SalesOrder/Changed/v1', async msg => {
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

    this.on('userInfo', req => {
        let results = {};
        results.user = cds.context.user.id;
        results.locale = cds.context.locale;
        results.scopes = {};
        results.scopes.identified = req.user.is('identified-user');
        results.scopes.authenticated = req.user.is('authenticated-user');
        results.scopes.Viewer = req.user.is('Viewer');
        results.scopes.Admin = req.user.is('Admin');
        return results;
    });

});