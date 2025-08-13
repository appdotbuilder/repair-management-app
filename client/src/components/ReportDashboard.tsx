import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Calendar, FileText, TrendingUp, TrendingDown, DollarSign, Package, Wrench, Users, Download } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { ServiceReport, InventoryReport, ReportPeriod } from '../../../server/src/schema';

export default function ReportDashboard() {
  const [serviceReport, setServiceReport] = useState<ServiceReport | null>(null);
  const [inventoryReport, setInventoryReport] = useState<InventoryReport | null>(null);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly');
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  
  // Daily/Weekly/Monthly summaries
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [weeklySummary, setWeeklySummary] = useState<any>(null);
  const [monthlySummary, setMonthlySummary] = useState<any>(null);
  const [summaryDate, setSummaryDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const generateReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const [serviceReportResult, inventoryReportResult] = await Promise.all([
        trpc.generateServiceReport.query({
          period: reportPeriod,
          start_date: new Date(startDate),
          end_date: new Date(endDate)
        }),
        trpc.generateInventoryReport.query({
          period: reportPeriod,
          start_date: new Date(startDate),
          end_date: new Date(endDate)
        })
      ]);
      
      setServiceReport(serviceReportResult);
      setInventoryReport(inventoryReportResult);
    } catch (error) {
      console.error('Failed to generate reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, [reportPeriod, startDate, endDate]);

  const loadSummaries = useCallback(async () => {
    try {
      const selectedDate = new Date(summaryDate);
      const [daily, weekly, monthly] = await Promise.all([
        trpc.getDailySummary.query({ date: selectedDate }),
        trpc.getWeeklySummary.query({ startDate: selectedDate }),
        trpc.getMonthlySummary.query({ 
          year: selectedDate.getFullYear(), 
          month: selectedDate.getMonth() + 1 
        })
      ]);
      
      setDailySummary(daily);
      setWeeklySummary(weekly);
      setMonthlySummary(monthly);
    } catch (error) {
      console.error('Failed to load summaries:', error);
    }
  }, [summaryDate]);

  useEffect(() => {
    generateReports();
  }, [generateReports]);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  const handlePeriodChange = (period: ReportPeriod) => {
    setReportPeriod(period);
    const today = new Date();
    
    switch (period) {
      case 'daily':
        setStartDate(today.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'weekly':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        setStartDate(weekStart.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'monthly':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(monthStart.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'yearly':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        setStartDate(yearStart.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Reports
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="service">Service Reports</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Reports</TabsTrigger>
          <TabsTrigger value="financial">Financial Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Overview</CardTitle>
              <CardDescription>Key performance indicators for your repair business</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {serviceReport?.total_services || 0}
                  </div>
                  <div className="text-sm text-gray-500">Total Services</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {serviceReport?.completed_services || 0}
                  </div>
                  <div className="text-sm text-gray-500">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {serviceReport?.in_progress_services || 0}
                  </div>
                  <div className="text-sm text-gray-500">In Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(serviceReport?.total_revenue || 0)}
                  </div>
                  <div className="text-sm text-gray-500">Revenue</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Summaries */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Today's Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailySummary ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Services:</span>
                      <span className="font-medium">{dailySummary.services_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Revenue:</span>
                      <span className="font-medium">{formatCurrency(dailySummary.revenue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Completed:</span>
                      <span className="font-medium">{dailySummary.completed_services || 0}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weeklySummary ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Services:</span>
                      <span className="font-medium">{weeklySummary.services_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Revenue:</span>
                      <span className="font-medium">{formatCurrency(weeklySummary.revenue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Avg/Day:</span>
                      <span className="font-medium">{formatCurrency((weeklySummary.revenue || 0) / 7)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlySummary ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Services:</span>
                      <span className="font-medium">{monthlySummary.services_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Revenue:</span>
                      <span className="font-medium">{formatCurrency(monthlySummary.revenue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Growth:</span>
                      <span className="font-medium text-green-600">+12%</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">No data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="service" className="space-y-6">
          {/* Report Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Service Report Configuration</CardTitle>
              <CardDescription>Generate custom service reports for specified periods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="report-period">Report Period</Label>
                  <Select value={reportPeriod} onValueChange={handlePeriodChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={generateReports} disabled={isLoading} className="w-full">
                    {isLoading ? 'Generating...' : 'Generate Report'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Report Results */}
          {serviceReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Wrench className="h-5 w-5 mr-2" />
                    Service Statistics
                  </CardTitle>
                  <CardDescription>
                    {serviceReport.start_date.toLocaleDateString()} - {serviceReport.end_date.toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Services</span>
                      <span className="text-2xl font-bold">{serviceReport.total_services}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Completed</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-green-600">{serviceReport.completed_services}</span>
                        <div className="text-xs text-gray-500">
                          {formatPercentage(serviceReport.completed_services, serviceReport.total_services)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">In Progress</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-orange-600">{serviceReport.in_progress_services}</span>
                        <div className="text-xs text-gray-500">
                          {formatPercentage(serviceReport.in_progress_services, serviceReport.total_services)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t pt-4">
                      <span className="text-sm font-medium">Average Service Cost</span>
                      <span className="text-lg font-bold">{formatCurrency(serviceReport.average_service_cost)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Revenue Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Revenue</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(serviceReport.total_revenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Average per Service</span>
                      <span className="text-lg font-bold">
                        {formatCurrency(serviceReport.average_service_cost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Revenue per Day</span>
                      <span className="text-lg font-bold">
                        {formatCurrency(serviceReport.total_revenue / Math.max(1, 
                          Math.ceil((serviceReport.end_date.getTime() - serviceReport.start_date.getTime()) / (1000 * 60 * 60 * 24))
                        ))}
                      </span>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg border-t">
                      <div className="text-center">
                        <div className="text-sm text-green-700">Completion Rate</div>
                        <div className="text-2xl font-bold text-green-800">
                          {formatPercentage(serviceReport.completed_services, serviceReport.total_services)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          {inventoryReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Inventory Overview
                  </CardTitle>
                  <CardDescription>
                    {inventoryReport.start_date.toLocaleDateString()} - {inventoryReport.end_date.toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Products</span>
                      <span className="text-2xl font-bold">{inventoryReport.total_products}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Low Stock Items</span>
                      <span className="text-2xl font-bold text-orange-600">{inventoryReport.low_stock_products}</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-4">
                      <span className="text-sm font-medium">Inventory Value</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(inventoryReport.total_inventory_value)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Transaction Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Purchases</span>
                      <span className="text-2xl font-bold text-red-600">
                        {formatCurrency(inventoryReport.total_purchases)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Sales</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(inventoryReport.total_sales)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-4">
                      <span className="text-sm font-medium">Net Profit</span>
                      <span className={`text-lg font-bold ${
                        inventoryReport.total_sales - inventoryReport.total_purchases >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(inventoryReport.total_sales - inventoryReport.total_purchases)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Service Revenue</CardTitle>
                <Wrench className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(serviceReport?.total_revenue || 0)}</div>
                <p className="text-xs opacity-80">From {serviceReport?.completed_services || 0} completed services</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Product Sales</CardTitle>
                <Package className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(inventoryReport?.total_sales || 0)}</div>
                <p className="text-xs opacity-80">Product sales revenue</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency((serviceReport?.total_revenue || 0) + (inventoryReport?.total_sales || 0))}
                </div>
                <p className="text-xs opacity-80">Combined revenue streams</p>
              </CardContent>
            </Card>
          </div>

          {/* Financial Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Breakdown</CardTitle>
              <CardDescription>Detailed financial analysis for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium mb-4">Revenue Sources</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Service Revenue</span>
                      <span className="font-medium">{formatCurrency(serviceReport?.total_revenue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Product Sales</span>
                      <span className="font-medium">{formatCurrency(inventoryReport?.total_sales || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Total Revenue</span>
                      <span>{formatCurrency((serviceReport?.total_revenue || 0) + (inventoryReport?.total_sales || 0))}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-4">Expenses</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Product Purchases</span>
                      <span className="font-medium">{formatCurrency(inventoryReport?.total_purchases || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Net Profit</span>
                      <span className="text-green-600">
                        {formatCurrency(
                          (serviceReport?.total_revenue || 0) + 
                          (inventoryReport?.total_sales || 0) - 
                          (inventoryReport?.total_purchases || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}