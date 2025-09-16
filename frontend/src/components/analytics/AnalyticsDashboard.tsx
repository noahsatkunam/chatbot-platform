import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  Assessment,
  Speed,
  AttachMoney,
  Schedule,
  Warning,
  Refresh,
  Download,
  FilterList
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface AnalyticsData {
  overview: {
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    costSavings: number;
    activeWorkflows: number;
    scheduledExecutions: number;
  };
  trends: {
    executions: Array<{ date: string; count: number; success: number; failed: number }>;
    performance: Array<{ date: string; avgTime: number; p95Time: number; p99Time: number }>;
    costs: Array<{ date: string; actual: number; projected: number; savings: number }>;
  };
  workflowMetrics: Array<{
    id: string;
    name: string;
    executions: number;
    successRate: number;
    avgTime: number;
    lastRun: string;
    status: 'healthy' | 'warning' | 'critical';
  }>;
  resourceUsage: {
    cpu: Array<{ time: string; usage: number }>;
    memory: Array<{ time: string; usage: number }>;
    network: Array<{ time: string; usage: number }>;
  };
  predictions: {
    nextWeekLoad: number;
    recommendedScaling: string;
    costProjection: number;
    riskFactors: Array<{ factor: string; severity: string; impact: string }>;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const AnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('7d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/dashboard?timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to load analytics data');
      const analyticsData = await response.json();
      setData(analyticsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const exportData = async () => {
    try {
      const response = await fetch(`/api/analytics/export?timeRange=${timeRange}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading analytics data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={loadAnalyticsData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!data) return null;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="1d">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh Data">
            <IconButton onClick={loadAnalyticsData}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Data">
            <IconButton onClick={exportData}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assessment color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Executions</Typography>
              </Box>
              <Typography variant="h4">{data.overview.totalExecutions.toLocaleString()}</Typography>
              <Typography variant="body2" color="text.secondary">
                Total workflow executions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Success Rate</Typography>
              </Box>
              <Typography variant="h4">{(data.overview.successRate * 100).toFixed(1)}%</Typography>
              <Typography variant="body2" color="text.secondary">
                Workflow success rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Speed color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Avg Time</Typography>
              </Box>
              <Typography variant="h4">{Math.round(data.overview.avgExecutionTime)}s</Typography>
              <Typography variant="body2" color="text.secondary">
                Average execution time
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AttachMoney color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Savings</Typography>
              </Box>
              <Typography variant="h4">${data.overview.costSavings.toLocaleString()}</Typography>
              <Typography variant="body2" color="text.secondary">
                Cost savings this period
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Schedule color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Active</Typography>
              </Box>
              <Typography variant="h4">{data.overview.activeWorkflows}</Typography>
              <Typography variant="body2" color="text.secondary">
                Active workflows
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Schedule color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Scheduled</Typography>
              </Box>
              <Typography variant="h4">{data.overview.scheduledExecutions}</Typography>
              <Typography variant="body2" color="text.secondary">
                Scheduled executions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Trends" />
          <Tab label="Performance" />
          <Tab label="Workflows" />
          <Tab label="Resources" />
          <Tab label="Predictions" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Execution Trends</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.trends.executions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Area type="monotone" dataKey="success" stackId="1" stroke="#00C49F" fill="#00C49F" name="Successful" />
                    <Area type="monotone" dataKey="failed" stackId="1" stroke="#FF8042" fill="#FF8042" name="Failed" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Cost Analysis</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.trends.costs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="actual" stroke="#0088FE" name="Actual Cost" />
                    <Line type="monotone" dataKey="projected" stroke="#FFBB28" name="Projected" />
                    <Line type="monotone" dataKey="savings" stroke="#00C49F" name="Savings" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={data.trends.performance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgTime" stroke="#0088FE" name="Average Time" />
                    <Line type="monotone" dataKey="p95Time" stroke="#FFBB28" name="95th Percentile" />
                    <Line type="monotone" dataKey="p99Time" stroke="#FF8042" name="99th Percentile" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Workflow Performance</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                  {data.workflowMetrics.map((workflow) => (
                    <Card key={workflow.id} variant="outlined" sx={{ minWidth: 300 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle1">{workflow.name}</Typography>
                          <Chip 
                            size="small" 
                            color={workflow.status === 'healthy' ? 'success' : workflow.status === 'warning' ? 'warning' : 'error'}
                            label={workflow.status}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Executions: {workflow.executions} | Success: {(workflow.successRate * 100).toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Avg Time: {Math.round(workflow.avgTime)}s | Last Run: {new Date(workflow.lastRun).toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>CPU Usage</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.resourceUsage.cpu}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="usage" stroke="#0088FE" fill="#0088FE" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Memory Usage</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.resourceUsage.memory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="usage" stroke="#00C49F" fill="#00C49F" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Network Usage</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.resourceUsage.network}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="usage" stroke="#FFBB28" fill="#FFBB28" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Predictions</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1">
                    <strong>Next Week Load:</strong> {data.predictions.nextWeekLoad}% increase expected
                  </Typography>
                  <Typography variant="body1">
                    <strong>Scaling Recommendation:</strong> {data.predictions.recommendedScaling}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Cost Projection:</strong> ${data.predictions.costProjection.toLocaleString()} next month
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Risk Factors</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {data.predictions.riskFactors.map((risk, index) => (
                    <Alert 
                      key={index} 
                      severity={risk.severity === 'high' ? 'error' : risk.severity === 'medium' ? 'warning' : 'info'}
                      icon={<Warning />}
                    >
                      <strong>{risk.factor}:</strong> {risk.impact}
                    </Alert>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
