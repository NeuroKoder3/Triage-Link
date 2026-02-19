import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { appClient } from "@/api/appClient";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Brain, TrendingUp, Star, AlertCircle } from "lucide-react";

export default function AILearningMetrics() {
  const { data: feedbacks = [] } = useQuery({
    queryKey: ['aiFeedbacks'],
    queryFn: () => appClient.entities.AIFeedback.list('-created_date', 200),
  });

  // Calculate metrics
  const metrics = React.useMemo(() => {
    if (feedbacks.length === 0) return null;

    const avgRating = feedbacks.reduce((acc, f) => acc + f.accuracy_rating, 0) / feedbacks.length;
    const highRatings = feedbacks.filter(f => f.accuracy_rating >= 4).length;
    const lowRatings = feedbacks.filter(f => f.accuracy_rating <= 2).length;
    const overrideRate = (feedbacks.filter(f => f.was_overridden).length / feedbacks.length) * 100;

    // Group by misclassification type
    const misclassificationCounts = {};
    feedbacks.forEach(f => {
      if (f.misclassification_type && f.misclassification_type !== 'correct') {
        misclassificationCounts[f.misclassification_type] = (misclassificationCounts[f.misclassification_type] || 0) + 1;
      }
    });

    // Trend over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentFeedbacks = feedbacks.filter(f => new Date(f.created_date) >= thirtyDaysAgo);
    const dailyRatings = {};
    
    recentFeedbacks.forEach(f => {
      const date = new Date(f.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dailyRatings[date]) {
        dailyRatings[date] = { date, ratings: [], count: 0 };
      }
      dailyRatings[date].ratings.push(f.accuracy_rating);
      dailyRatings[date].count++;
    });

    const trendData = Object.values(dailyRatings).map(day => ({
      date: day.date,
      avgRating: day.ratings.reduce((a, b) => a + b, 0) / day.ratings.length,
      count: day.count
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    const misclassificationData = Object.entries(misclassificationCounts)
      .map(([type, count]) => ({
        type: type.replace(/_/g, ' '),
        count
      }))
      .sort((a, b) => b.count - a.count);

    return {
      avgRating: avgRating.toFixed(2),
      highRatings,
      lowRatings,
      overrideRate: overrideRate.toFixed(1),
      totalFeedbacks: feedbacks.length,
      trendData,
      misclassificationData
    };
  }, [feedbacks]);

  if (!metrics) {
    return (
      <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
        <CardContent className="p-8 text-center">
          <Brain className="w-16 h-16 mx-auto mb-4" style={{ color: '#60A5FA' }} />
          <p style={{ color: '#9CA3AF' }}>No AI feedback data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>Avg AI Rating</p>
                <p className="text-3xl font-bold" style={{ color: '#F59E0B' }}>
                  {metrics.avgRating}
                  <Star className="inline-block w-6 h-6 ml-1" style={{ color: '#F59E0B' }} />
                </p>
              </div>
              <Brain className="w-10 h-10" style={{ color: '#60A5FA' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border" style={{ borderColor: '#10B981', backgroundColor: '#374151' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>High Ratings</p>
                <p className="text-3xl font-bold" style={{ color: '#10B981' }}>
                  {metrics.highRatings}
                </p>
              </div>
              <TrendingUp className="w-10 h-10" style={{ color: '#10B981' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border" style={{ borderColor: '#EF4444', backgroundColor: '#374151' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>Low Ratings</p>
                <p className="text-3xl font-bold" style={{ color: '#EF4444' }}>
                  {metrics.lowRatings}
                </p>
              </div>
              <AlertCircle className="w-10 h-10" style={{ color: '#EF4444' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border" style={{ borderColor: '#F59E0B', backgroundColor: '#374151' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>Override Rate</p>
                <p className="text-3xl font-bold" style={{ color: '#F59E0B' }}>
                  {metrics.overrideRate}%
                </p>
              </div>
              <AlertCircle className="w-10 h-10" style={{ color: '#F59E0B' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Trend */}
      <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
        <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
          <CardTitle style={{ color: '#60A5FA' }}>
            <TrendingUp className="inline-block w-5 h-5 mr-2" />
            AI Performance Trend (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {metrics.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#60A5FA" />
                <YAxis domain={[0, 5]} stroke="#60A5FA" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#374151', border: '1px solid #60A5FA', color: '#60A5FA' }}
                  formatter={(value) => [value.toFixed(2), 'Avg Rating']}
                />
                <Line type="monotone" dataKey="avgRating" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12" style={{ color: '#9CA3AF' }}>
              Not enough data for trend analysis yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Common Misclassifications */}
      <Card className="border" style={{ borderColor: '#EF4444', backgroundColor: '#374151' }}>
        <CardHeader className="border-b" style={{ borderColor: '#EF4444' }}>
          <CardTitle style={{ color: '#60A5FA' }}>
            <AlertCircle className="inline-block w-5 h-5 mr-2" />
            Common Misclassification Types
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {metrics.misclassificationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.misclassificationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#60A5FA" />
                <YAxis dataKey="type" type="category" width={150} stroke="#60A5FA" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#374151', border: '1px solid #60A5FA', color: '#60A5FA' }}
                />
                <Bar dataKey="count" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12" style={{ color: '#9CA3AF' }}>
              No misclassifications reported yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Learning Insights */}
      <Card className="border" style={{ borderColor: '#10B981', backgroundColor: '#374151' }}>
        <CardHeader className="border-b" style={{ borderColor: '#10B981' }}>
          <CardTitle style={{ color: '#60A5FA' }}>
            <Brain className="inline-block w-5 h-5 mr-2" />
            AI Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#4B5563' }}>
              <p className="text-sm mb-2" style={{ color: '#9CA3AF' }}>Total Feedback Collected</p>
              <p className="text-2xl font-bold" style={{ color: '#60A5FA' }}>{metrics.totalFeedbacks}</p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#4B5563' }}>
              <p className="text-sm mb-2" style={{ color: '#9CA3AF' }}>Accuracy Improvement Opportunity</p>
              <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>
                {((5 - parseFloat(metrics.avgRating)) / 5 * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#1E3A8A' }}>
            <p className="text-sm" style={{ color: '#93C5FD' }}>
              💡 The AI learns from every piece of feedback. Continue rating AI suggestions to improve accuracy for complex symptoms and edge cases.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}