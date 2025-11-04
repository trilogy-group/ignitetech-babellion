import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp, ThumbsDown, Loader2, FileText, User, Calendar, ChevronLeft, ChevronRight, ExternalLink, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
  const isMobile = useIsMobile();

  // Fetch all translations for the filter dropdown
  const { data: translations = [] } = useQuery<Translation[]>({
    queryKey: ["/api/translations"],
  });

  // Fetch paginated feedback (server-side pagination)
  const { data: feedbackResponse, isLoading } = useQuery<{
    data: FeedbackWithDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["/api/all-feedback", currentPage, pageSize],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/all-feedback?page=${currentPage}&limit=${pageSize}`);
      return await response.json();
    },
  });

  const allFeedback = feedbackResponse?.data || [];
  const serverPagination = feedbackResponse?.pagination;

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

  // Use client-side filtering on paginated data
  const paginatedFeedback = filteredFeedback;
  
  // Use server pagination info, but filter count for display
  const totalPages = serverPagination?.totalPages || 1;
  const totalCount = serverPagination?.total || 0;

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
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Translation Feedback</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                View and analyze user feedback on translations. To give feedback, select a segment of the translated text and click the feedback option.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>
                {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
                {totalCount > 0 && ` (page ${currentPage} of ${totalPages})`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-muted/10">
        <div className="container mx-auto px-4 sm:px-6">
          <Button
            variant="ghost"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="w-full justify-between h-10 sm:h-auto sm:w-auto sm:px-3 sm:py-2"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters</span>
              {(selectedTranslation !== "all" || sentimentFilter !== "all" || languageFilter !== "all" || searchText) && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  Active
                </Badge>
              )}
            </div>
            {filtersExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          {filtersExpanded && (
            <div className="pb-3 sm:pb-4 pt-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <div className="flex-1 min-w-0 w-full sm:min-w-[200px]">
              <Input
                placeholder="Search feedback text..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 w-full"
              />
            </div>
            <Select value={selectedTranslation} onValueChange={handleFilterChange(setSelectedTranslation)}>
              <SelectTrigger className="w-full sm:w-[250px] h-9">
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
              <SelectTrigger className="w-full sm:w-[180px] h-9">
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
              <SelectTrigger className="w-full sm:w-[180px] h-9">
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
                <div className="flex items-center gap-2 w-full sm:w-auto">
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
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 h-full">
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
          ) : isMobile ? (
            <Card className="h-full flex flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-4 p-4">
                  {paginatedFeedback.map((feedback) => {
                    const userName = feedback.user?.firstName && feedback.user?.lastName
                      ? `${feedback.user.firstName} ${feedback.user.lastName}`
                      : feedback.user?.email || "Unknown User";
                    
                    return (
                      <Card key={feedback.id} className="p-4">
                        <div className="space-y-3">
                          {/* Header: User + Date */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{userName}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {feedback.createdAt ? formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true }) : 'N/A'}
                                </p>
                              </div>
                            </div>
                            {feedback.sentiment === "positive" ? (
                              <ThumbsUp className="h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <ThumbsDown className="h-5 w-5 text-red-600 flex-shrink-0" />
                            )}
                          </div>

                          {/* Translation + Language */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {feedback.translation?.id ? (
                              <Link href={`/translate#${feedback.translation.id}`}>
                                <span className="flex items-center gap-1.5 text-sm text-primary hover:underline cursor-pointer">
                                  {feedback.translation.title}
                                  <ExternalLink className="h-3 w-3" />
                                </span>
                              </Link>
                            ) : (
                              <span className="text-sm text-muted-foreground">Unknown Translation</span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {feedback.output?.languageName || "N/A"}
                            </Badge>
                          </div>

                          {/* Model */}
                          <div className="text-xs text-muted-foreground">
                            Model: {feedback.modelUsed || "N/A"}
                          </div>

                          {/* Selected Text */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Selected Text:</p>
                            <div className="text-xs leading-relaxed bg-muted/50 p-2 rounded">
                              "{feedback.selectedText.length > 150 ? feedback.selectedText.substring(0, 150) + '...' : feedback.selectedText}"
                            </div>
                          </div>

                          {/* Feedback Text */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Feedback:</p>
                            <div className="text-xs leading-relaxed">
                              {feedback.feedbackText}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Pagination Controls */}
              {totalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t">
                  <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-9"
                    >
                      <ChevronLeft className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Previous</span>
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
                      className="h-9"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4 sm:ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="h-full flex flex-col">
              <ScrollArea className="flex-1">
                <Table>
                  <TableCaption>
                    A list of all translation feedback from users
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead className="w-[150px]">User</TableHead>
                      <TableHead className="w-[180px]">Translation</TableHead>
                      <TableHead className="w-[100px]">Language</TableHead>
                      <TableHead className="w-[140px]">Model</TableHead>
                      <TableHead className="w-[280px]">Selected Text</TableHead>
                      <TableHead className="w-[320px]">Feedback</TableHead>
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
                            {feedback.createdAt ? formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true }) : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{userName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-xs">
                            {feedback.translation?.id ? (
                              <Link href={`/translate#${feedback.translation.id}`}>
                                <span className="flex items-center gap-1.5 text-primary hover:underline cursor-pointer transition-all duration-100">
                                  {feedback.translation.title}
                                  <ExternalLink className="h-3 w-3" />
                                </span>
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">Unknown</span>
                            )}
                          </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {feedback.output?.languageName || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>{feedback.modelUsed || "N/A"}</span>
                            {feedback.sentiment === "positive" ? (
                              <ThumbsUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <ThumbsDown className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs leading-relaxed" title={feedback.selectedText}>
                            "{feedback.selectedText.length > 200 ? feedback.selectedText.substring(0, 200) + '...' : feedback.selectedText}"
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs leading-relaxed">
                            {feedback.feedbackText}
                          </div>
                        </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
              {/* Pagination Controls */}
              {totalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t">
                  <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-9"
                    >
                      <ChevronLeft className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Previous</span>
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
                      className="h-9"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4 sm:ml-1" />
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

