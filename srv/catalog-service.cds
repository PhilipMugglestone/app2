using {app2.db as db} from '../db/data-model';

using {
  CV_SALES,
  CV_SESSION_INFO
} from '../db/data-model';

using {API_SALES_ORDER_SRV} from './external/API_SALES_ORDER_SRV.csn';

service CatalogService @(path: '/catalog') @(requires: 'authenticated-user') {
  entity Sales @(restrict: [
    {
      grant: ['READ'],
      to   : 'Viewer'
    },
    {
      grant: ['WRITE'],
      to   : 'Admin'
    }
  ])                                                  as select * from db.Sales
    actions {
      @(restrict: [{to: 'Viewer'}])
      function largestOrder() returns String;
      @(restrict: [{to: 'Admin'}])
      action   boost()        returns Sales;
    };

  entity VSales @(restrict: [{to: 'Viewer'}])         as select * from CV_SALES;

  @readonly
  entity SessionInfo @(restrict: [{to: 'Viewer'}])    as select * from CV_SESSION_INFO;

  function topSales @(restrict: [{to: 'Viewer'}])(amount : Integer) returns many Sales;

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

  function userInfo()                                               returns userType;

};
