"use client";

import React from 'react';
import RestaurantMenu from '../../../components/Menu/RestaurantMenu';
import { etarBellotaFont } from '../../etarBellotaFont';
import Breadcrumb from '../../../components/Common/Breadcrumb';

const RestaurantMenuPage = () => {
  return (
    <>
      <Breadcrumb pathname="/menu/restaurant" title="Restaurant Menu" />

      {/* Full Menu Section */}
      <RestaurantMenu />
    </>
  );
};

export default RestaurantMenuPage;
