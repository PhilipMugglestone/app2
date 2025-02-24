using {
      cuid,
      managed
} from '@sap/cds/common';

context app2.db {

      entity SalesOrdersLog : cuid, managed {
            salesOrder         : String;
            incotermsLocation1 : String;
      };

}
