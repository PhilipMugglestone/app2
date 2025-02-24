using {app2.db as db} from '../db/data-model';
using {API_SALES_ORDER_SRV} from './external/API_SALES_ORDER_SRV.csn';

service CatalogService @(path: '/catalog') @(requires: 'authenticated-user') {

  @readonly
  entity SalesOrders @(restrict: [{to: 'Viewer'}])    as
    projection on API_SALES_ORDER_SRV.A_SalesOrder {
      SalesOrder,
      SalesOrganization,
      DistributionChannel,
      SoldToParty,
      IncotermsLocation1,
      TotalNetAmount,
      TransactionCurrency
    };

  entity SalesOrdersLog @(restrict: [{to: 'Viewer'}]) as select * from db.SalesOrdersLog;

  type userScopes {
    identified    : Boolean;
    authenticated : Boolean;
    Viewer        : Boolean;
    Admin         : Boolean;
  };

  type userType {
    user   : String;
    locale : String;
    scopes : userScopes;
  };

  function userInfo() returns userType;

};
