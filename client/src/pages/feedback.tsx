import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp, ThumbsDown, Loader2, FileText, User, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import type { Translation, TranslationFeedback } from "@shared/schema";

interface FeedbackWithDetails extends TranslationFeedback {
  translation?: {
    title: string;
    id: string;
  };
  user?: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  output?: {
    languageName: string;
    languageCode: string;
  };
}

export default function Feedback() {
  const [selectedTranslation, setSelectedTranslation] = useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch all translations for the filter dropdown
  const { data: translations = [] } = useQuery<Translation[]>({
    queryKey: ["/api/translations"],
  });

  // Fetch all feedback (already enriched with user, translation, and output data from backend)
  const { data: allFeedback = [], isLoading } = useQuery<FeedbackWithDetails[]>({
    queryKey: ["/api/all-feedback"],
  });

  // Get unique languages from feedback
  const availableLanguages = useMemo(() => {
    const languageMap = new Map<string, string>();
    allFeedback.forEach((feedback) => {
      if (feedback.output?.languageCode && feedback.output?.languageName) {
        languageMap.set(feedback.output.languageCode, feedback.output.languageName);
      }
    });
    return Array.from(languageMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allFeedback]);

  // Filter feedback based on selections
  const filteredFeedback = useMemo(() => {
    return allFeedback.filter((feedback) => {
      const matchesTranslation = selectedTranslation === "all" || feedback.translationId === selectedTranslation;
      const matchesSentiment = sentimentFilter === "all" || feedback.sentiment === sentimentFilter;
      const matchesLanguage = languageFilter === "all" || feedback.output?.languageCode === languageFilter;
      const matchesSearch = searchText === "" || 
        feedback.selectedText.toLowerCase().includes(searchText.toLowerCase()) ||
        feedback.feedbackText.toLowerCase().includes(searchText.toLowerCase());
      
      return matchesTranslation && matchesSentiment && matchesLanguage && matchesSearch;
    });
  }, [allFeedback, selectedTranslation, sentimentFilter, languageFilter, searchText]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredFeedback.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedFeedback = filteredFeedback.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Translation Feedback</h1>
              <p className="text-muted-foreground mt-1">
                View and analyze user feedback on translations
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>
                {filteredFeedback.length} feedback {filteredFeedback.length === 1 ? 'entry' : 'entries'}
                {filteredFeedback.length > 0 && ` (page ${currentPage} of ${totalPages})`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-muted/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search feedback text..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9"
              />
            </div>
            <Select value={selectedTranslation} onValueChange={handleFilterChange(setSelectedTranslation)}>
              <SelectTrigger className="w-[250px] h-9">
                <SelectValue placeholder="Filter by translation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Translations</SelectItem>
                {translations.map((translation) => (
                  <SelectItem key={translation.id} value={translation.id}>
                    {translation.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={languageFilter} onValueChange={handleFilterChange(setLanguageFilter)}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filter by language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {availableLanguages.map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sentimentFilter} onValueChange={handleFilterChange(setSentimentFilter)}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filter by sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="positive">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-3 w-3" />
                    Positive
                  </div>
                </SelectItem>
                <SelectItem value="negative">
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="h-3 w-3" />
                    Negative
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Per page:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto px-6 py-6 h-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading feedback...</p>
              </div>
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No feedback found</p>
                <p className="text-sm text-muted-foreground">
                  {allFeedback.length === 0
                    ? "No feedback has been submitted yet."
                    : "Try adjusting your filters."}
                </p>
              </div>
            </div>
          ) : (
            <Card className="h-full flex flex-col">
              <ScrollArea className="flex-1">
                <Table>
                  <TableCaption>
                    A list of all translation feedback from users
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Date</TableHead>
                      <TableHead className="w-[180px]">User</TableHead>
                      <TableHead className="w-[200px]">Translation</TableHead>
                      <TableHead className="w-[120px]">Language</TableHead>
                      <TableHead className="w-[100px]">Sentiment</TableHead>
                      <TableHead className="w-[250px]">Selected Text</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead className="w-[120px]">Model</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFeedback.map((feedback) => {
                      const userName = feedback.user?.firstName && feedback.user?.lastName
                        ? `${feedback.user.firstName} ${feedback.user.lastName}`
                        : feedback.user?.email || "Unknown User";
                      
                      return (
                        <TableRow key={feedback.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{userName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {feedback.translation?.title || "Unknown"}
                          </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {feedback.output?.languageName || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {feedback.sentiment === "positive" ? (
                            <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              Good
                            </Badge>
                          ) : (
                            <Badge className="bg-red-600 hover:bg-red-700 text-xs">
                              <ThumbsDown className="h-3 w-3 mr-1" />
                              Needs Work
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[250px] truncate text-sm" title={feedback.selectedText}>
                            "{feedback.selectedText}"
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[400px] text-sm">
                            {feedback.feedbackText}
                          </div>
                        </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {feedback.modelUsed || "N/A"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination Controls */}
              {filteredFeedback.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredFeedback.length)} of {filteredFeedback.length} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            className="w-9 h-9 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

