import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function AIFeedbackModal({ triageLog, aiAnalysis, onSubmit, onClose }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [misclassificationType, setMisclassificationType] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [missedSymptoms, setMissedSymptoms] = useState("");
  const [suggestedImprovements, setSuggestedImprovements] = useState("");
  const [helpfulContext, setHelpfulContext] = useState("");

  const handleSubmit = () => {
    if (rating === 0) {
      alert("Please provide a rating");
      return;
    }

    onSubmit({
      accuracy_rating: rating,
      misclassification_type: misclassificationType || (rating >= 4 ? "correct" : undefined),
      feedback_text: feedbackText,
      missed_symptoms: missedSymptoms ? missedSymptoms.split(',').map(s => s.trim()) : [],
      suggested_improvements: suggestedImprovements,
      helpful_context: helpfulContext
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
          <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
            <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
              <ThumbsUp className="w-5 h-5" />
              Rate AI Performance & Provide Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* AI Summary Display */}
            <div className="p-4 rounded-lg border" style={{ backgroundColor: '#4B5563', borderColor: '#60A5FA' }}>
              <h4 className="font-semibold mb-2" style={{ color: '#60A5FA' }}>AI Analysis Summary</h4>
              <p className="text-sm mb-2" style={{ color: '#9CA3AF' }}>{aiAnalysis?.ai_summary}</p>
              <div className="flex gap-2">
                <Badge style={{ backgroundColor: '#60A5FA', color: '#000000' }}>
                  {aiAnalysis?.urgency_level}
                </Badge>
                <Badge style={{ backgroundColor: '#10B981', color: '#000000' }}>
                  {aiAnalysis?.confidence_score}% confidence
                </Badge>
              </div>
            </div>

            {/* Star Rating */}
            <div>
              <Label className="mb-2 block" style={{ color: '#60A5FA' }}>
                How accurate was the AI suggestion? *
              </Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className="w-10 h-10"
                      fill={(hoveredRating || rating) >= star ? '#F59E0B' : 'none'}
                      style={{ color: '#F59E0B' }}
                    />
                  </button>
                ))}
                <span className="ml-4 text-lg font-semibold" style={{ color: '#60A5FA' }}>
                  {rating > 0 && `${rating} / 5`}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                1 = Very Inaccurate, 5 = Perfect
              </p>
            </div>

            {/* Misclassification Type (if low rating) */}
            {rating > 0 && rating < 4 && (
              <div>
                <Label style={{ color: '#60A5FA' }}>What went wrong?</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { value: "wrong_urgency", label: "Wrong Urgency Level" },
                    { value: "wrong_category", label: "Wrong Category" },
                    { value: "missed_symptom", label: "Missed Key Symptom" },
                    { value: "over_sensitive", label: "Over-Sensitive" },
                    { value: "under_sensitive", label: "Under-Sensitive" }
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setMisclassificationType(type.value)}
                      className="p-3 rounded-lg border text-sm transition-all"
                      style={{
                        backgroundColor: misclassificationType === type.value ? '#60A5FA' : '#4B5563',
                        borderColor: misclassificationType === type.value ? '#60A5FA' : '#6B7280',
                        color: misclassificationType === type.value ? '#000000' : '#60A5FA'
                      }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Text */}
            <div>
              <Label style={{ color: '#60A5FA' }}>Detailed Feedback</Label>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Describe what the AI got right or wrong, and why..."
                className="mt-2"
                rows={4}
                style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
              />
            </div>

            {/* Missed Symptoms */}
            {rating < 4 && (
              <div>
                <Label style={{ color: '#60A5FA' }}>Missed or Misinterpreted Symptoms</Label>
                <Input
                  value={missedSymptoms}
                  onChange={(e) => setMissedSymptoms(e.target.value)}
                  placeholder="e.g., fever, chest pain, shortness of breath (comma-separated)"
                  className="mt-2"
                  style={{ borderColor: '#F59E0B', backgroundColor: '#4B5563', color: '#60A5FA' }}
                />
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  List symptoms the AI should have caught
                </p>
              </div>
            )}

            {/* Suggested Improvements */}
            <div>
              <Label style={{ color: '#60A5FA' }}>Suggestions for AI Improvement</Label>
              <Textarea
                value={suggestedImprovements}
                onChange={(e) => setSuggestedImprovements(e.target.value)}
                placeholder="What should the AI learn from this case?"
                className="mt-2"
                rows={3}
                style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
              />
            </div>

            {/* Helpful Context */}
            <div>
              <Label style={{ color: '#60A5FA' }}>Additional Context (for future AI training)</Label>
              <Textarea
                value={helpfulContext}
                onChange={(e) => setHelpfulContext(e.target.value)}
                placeholder="Any additional information that would help the AI make better decisions in similar cases..."
                className="mt-2"
                rows={3}
                style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
                style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={rating === 0}
                className="flex-1"
                style={{ backgroundColor: '#60A5FA', color: '#000000' }}
              >
                Submit Feedback
              </Button>
            </div>

            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#1E3A8A' }}>
              <p className="text-xs" style={{ color: '#93C5FD' }}>
                <AlertCircle className="inline-block w-3 h-3 mr-1" />
                Your feedback helps improve AI accuracy for all coordinators
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}