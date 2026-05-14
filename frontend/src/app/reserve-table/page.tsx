"use client";

import Reservation from "@/components/Home/Reservation";
import Breadcrumb from '../../components/Common/Breadcrumb';

const ReserveTablePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Breadcrumb pathname="/reserve-table" title="Reserve Your Table" />
      <Reservation />
    </div>
  );
};

export default ReserveTablePage;
