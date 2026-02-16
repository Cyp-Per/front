
import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Wallet, Users, FileText, ShoppingCart, ArrowRight, Rocket, Globe, Zap, Shield, PieChart, CreditCard, BarChart2, TrendingUp, Target } from 'lucide-react';
import { GeminiWidget } from '../components/GeminiWidget';
import { useLanguage } from '../context/LanguageContext';

export const Dashboard: React.FC = () => {
  const { t } = useLanguage();

  const STATS = [
    { label: t.dashboard.stats.money, value: "$53,000", change: "+55%", isPositive: true, icon: Wallet },
    { label: t.dashboard.stats.users, value: "2,300", change: "+5%", isPositive: true, icon: Users },
    { label: t.dashboard.stats.clients, value: "+3,052", change: "-14%", isPositive: false, icon: FileText },
    { label: t.dashboard.stats.sales, value: "$173,000", change: "+8%", isPositive: true, icon: ShoppingCart },
  ];

  const barChartSeries = [{ name: t.dashboard.metrics.sales, data: [350, 200, 450, 300, 480, 250, 400, 320, 500] }];
  const dataValues = barChartSeries[0].data;
  const maxValue = Math.max(...dataValues);
  const yAxisMax = Math.ceil(maxValue * 1.1); // +10 %, arrondi au-dessus
  
  const barChartOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter, sans-serif', parentHeightOffset: 0 },
    theme: { mode: 'light' },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '15%', distributed: false, dataLabels: { position: 'top' } } },
    dataLabels: { enabled: true, offsetY: -20, style: { fontSize: '12px', colors: ["#000000"] } },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: t.dashboard.months,
      axisBorder: { show: false }, axisTicks: { show: false },
      labels: { style: { colors: '#4B5563', fontSize: '12px', fontWeight: 600 } },
    },
    yaxis: { max: yAxisMax, labels: { style: { colors: '#4B5563', fontSize: '12px', fontWeight: 600 } } },
    fill: {
      type: 'gradient',
      gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.5, gradientToColors: ['#3b3ce0'], inverseColors: false, opacityFrom: 1, opacityTo: 1, stops: [0, 100] },
    },
    colors: ['#141585'], 
    grid: { borderColor: '#E2E8F0', strokeDashArray: 4, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } }, padding: { top: 0, right: 0, bottom: 0, left: 10 } },
    tooltip: { y: { formatter: (val) => `$${val}` }, theme: 'light' },
  };


  const lineChartOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'Inter, sans-serif', zoom: { enabled: false }, sparkline: { enabled: false }, parentHeightOffset: 0 },
    theme: { mode: 'light' },
    dataLabels: { enabled: false }, stroke: { curve: 'smooth', width: 3 },
    xaxis: { categories: t.dashboard.months.slice(0, 7), labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false }, crosshairs: { show: false }, tooltip: { enabled: false } },
    yaxis: { show: false },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.2, stops: [0, 90, 100] } },
    colors: ['#141585'],
    grid: { show: false, padding: { top: 0, bottom: 0, left: 0, right: 0 } },
    tooltip: { theme: 'light' },
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
        {STATS.map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] flex items-center justify-between border border-gray-50 transition-transform hover:-translate-y-1 duration-300">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">{stat.label}</p>
              <div className="flex items-end gap-2">
                <h4 className="text-xl font-bold text-[#141585]">{stat.value}</h4>
                <span className={`text-sm font-bold flex items-center ${stat.isPositive ? 'text-green-500' : 'text-red-500'}`}>{stat.change}</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-[#141585] rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/30">
              <stat.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full lg:h-[400px] h-auto">
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-50 relative overflow-hidden flex flex-col sm:flex-row h-full min-h-[300px] group">
          <div className="p-8 flex flex-col justify-between w-full sm:w-[60%] z-10">
            <div>
              <p className="text-gray-400 font-medium text-sm mb-2">{t.dashboard.builtBy}</p>
              <h3 className="text-2xl font-bold text-[#141585] mb-4">{t.dashboard.title}</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">{t.dashboard.description}</p>
            </div>
            <button className="flex items-center gap-2 text-[#141585] font-bold text-sm hover:gap-3 transition-all mt-4 sm:mt-0">
              {t.dashboard.readMore} <ArrowRight size={16} />
            </button>
          </div>
          <div className="relative sm:absolute top-0 right-0 h-64 sm:h-full w-full sm:w-[40%] bg-gradient-to-bl from-[#141585] to-indigo-600 overflow-hidden flex items-center justify-center">
            {/* Background blur effects */}
            <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-indigo-400/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-blue-400/20 rounded-full blur-2xl"></div>

            <div className="relative w-full h-full">
              {/* Center Main Icon */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                 <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl rotate-6 transition-all duration-700 ease-in group-hover:translate-x-[300%] group-hover:-translate-y-[300%] group-hover:rotate-45">
                    <Rocket className="text-[#141585] w-14 h-14" />
                 </div>
              </div>

              {/* Floating Icons */}
              {/* Top Left - Globe */}
              <div className="absolute top-[15%] left-[20%] w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg -rotate-12 opacity-90 transition-transform duration-500 group-hover:-translate-x-2 group-hover:-translate-y-2">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              
              {/* Top Right - Zap */}
              <div className="absolute top-[20%] right-[15%] w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg rotate-12 opacity-95 transition-transform duration-500 group-hover:translate-x-2 group-hover:-translate-y-2">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>

              {/* Bottom Left - PieChart */}
              <div className="absolute bottom-[20%] left-[15%] w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-lg rotate-45 opacity-90 transition-transform duration-500 group-hover:-translate-x-2 group-hover:translate-y-2">
                 <PieChart className="w-5 h-5 text-orange-400" />
              </div>

              {/* Bottom Right - Shield */}
              <div className="absolute bottom-[25%] right-[20%] w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg -rotate-6 opacity-85 transition-transform duration-500 group-hover:translate-x-2 group-hover:translate-y-2">
                 <Shield className="w-4 h-4 text-emerald-400" />
              </div>

              {/* Far Top Left - CreditCard */}
              <div className="absolute top-[5%] left-[10%] w-7 h-7 bg-white/80 rounded-lg flex items-center justify-center shadow-md rotate-45 opacity-60">
                 <CreditCard className="w-3 h-3 text-purple-400" />
              </div>

               {/* Middle Right Edge - Wallet */}
              <div className="absolute top-[50%] right-[5%] w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center shadow-md -rotate-12 opacity-80">
                 <Wallet className="w-4 h-4 text-pink-400" />
              </div>

              {/* Mid Left - Target */}
              <div className="absolute top-[40%] left-[10%] w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center shadow-md rotate-12 opacity-70 transition-transform duration-500 group-hover:translate-x-2 group-hover:-translate-y-1">
                 <Target className="w-4 h-4 text-red-400" />
              </div>

              {/* Bottom Center - TrendingUp */}
              <div className="absolute bottom-[10%] left-[45%] w-9 h-9 bg-white/90 rounded-lg flex items-center justify-center shadow-md -rotate-6 opacity-80 transition-transform duration-500 group-hover:-translate-x-1 group-hover:-translate-y-2">
                 <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="h-full min-h-[400px] shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] rounded-2xl">
          <GeminiWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#141585]">{t.dashboard.salesOverview}</h3>
              <p className="text-sm text-green-500 font-medium flex items-center gap-1">
                <span className="text-green-500">(+5) more</span> 
                <span className="text-gray-400 font-normal">in 2024</span>
              </p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <BarChart2 className="text-[#141585] w-5 h-5" />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <Chart options={barChartOptions} series={barChartSeries} type="bar" height="100%" width="100%" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_-4px_rgba(6,81,237,0.1)] border border-gray-50 flex flex-col">
           <div className="mb-4">
            <h3 className="text-lg font-bold text-[#141585]">{t.dashboard.activeUsers}</h3>
            <p className="text-sm text-gray-400">{t.dashboard.userActivitySubtitle}</p>
          </div>
          
          <div className="relative h-[200px] mb-6 w-full">
             <Chart options={lineChartOptions} series={[{ name: t.dashboard.metrics.users, data: [30, 40, 25, 50, 49, 21, 70] }]} type="area" height="100%" width="100%" />
          </div>

          <div className="space-y-5 mt-auto">
            {[
              { label: t.dashboard.metrics.users, value: '32,984', icon: Users, color: 'bg-indigo-500' },
              { label: t.dashboard.metrics.clicks, value: '2.42m', icon: Rocket, color: 'bg-teal-400' },
              { label: t.dashboard.metrics.sales, value: '$2,400', icon: ShoppingCart, color: 'bg-orange-400' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${item.color}`}>
                    <item.icon size={14} />
                  </div>
                  <span className="text-sm font-medium text-gray-600">{item.label}</span>
                </div>
                <div className="flex flex-col items-end w-24">
                   <span className="text-sm font-bold text-[#141585]">{item.value}</span>
                   <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                     <div className={`h-full ${item.color}`} style={{ width: '60%' }}></div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
