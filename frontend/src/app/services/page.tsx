'use client';

import { useState, useEffect } from 'react';
import { etarBellotaFont } from '../etarBellotaFont';
import Breadcrumb from '../../components/Common/Breadcrumb';
import { apiClient } from '../../lib/api-client';
import { Service } from '../../lib/types';
import { Loader2 } from 'lucide-react';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await apiClient.getServices();
        if (response.success) {
          let serviceData = response.data?.services || response.data?.data || response.data || response.services || [];
          serviceData = Array.isArray(serviceData) ? serviceData : [];

          // Normalize service data
          serviceData = serviceData.map((service: any) => ({
            ...service,
            title: service.title || service.name || 'Unnamed Service',
            description: service.description || '',
            category: service.category || 'General',
            price: service.price || null,
            duration: service.duration || null,
            isActive: service.isActive !== undefined ? service.isActive : true,
            icon: service.icon || '',
            features: service.features || [],
            createdAt: service.createdAt || service.created_at || new Date().toISOString(),
            updatedAt: service.updatedAt || service.updated_at || new Date().toISOString()
          }));

          setServices(serviceData);
        }
      } catch (error) {
        console.error('Failed to fetch services:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  return (
    <>
      <Breadcrumb pathname="/services" title="Our Services" />
      <section className={`min-h-screen bg-[#111115] md:py-10 py-10 ${etarBellotaFont.variable}`}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xl text-[#bdbdbd] max-w-3xl mx-auto">
              Discover the range of services we offer to enhance your dining experience
            </p>
          </div>

          <div className="bg-[#18181c] rounded-lg p-8 md:p-12 border border-[#23232a] max-w-4xl mx-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#F36B24] animate-spin" />
              </div>
            ) : services.length > 0 ? (
              <ul className="space-y-8">
                {services.map((service) => (
                  <li key={service.id} className="flex items-start border-b border-[#23232a] pb-8 last:border-0 last:pb-0">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#F36B24] bg-opacity-10 flex items-center justify-center mr-6">
                      {service.icon ? (
                        <img src={service.icon} alt="" className="w-6 h-6" />
                      ) : (
                        <svg className="w-6 h-6 text-[#F36B24]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-bold text-white">{service.title}</h3>
                        {service.price && (
                          <span className="text-[#F36B24] font-semibold">${service.price.toFixed(2)}</span>
                        )}
                      </div>
                      <p className="text-[#bdbdbd] mb-3">
                        {service.description}
                      </p>
                      {service.features && service.features.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {service.features.map((feature, idx) => (
                            <span key={idx} className="text-xs bg-[#23232a] text-gray-400 px-2 py-1 rounded">
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No services available at the moment.
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
