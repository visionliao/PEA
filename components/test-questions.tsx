"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Trash2, X, Check } from "lucide-react"

interface Question {
  id: string
  question: string
  answer: string
}

export function TestQuestions() {
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "1",
      question: "我有一只猫，你们可以养宠物吧？",
      answer:
        "您好！是的，我们社区非常欢迎携带宠物入住。关于宠物入住，我们有以下规定：宠物租金： 单只宠物每月需支付1000元人民币的租金。请您注意，在公共区域使用设施设备时，也请让宠物远离设备和热水，确保安全。",
    },
    {
      id: "2",
      question: "公寓概况与设施",
      answer:
        "驻在星耀 (The Spark by Greystar)公寓位于中国上海市静安区虬江路931号。项目由Greystar运营，致力于为城市租户打造一个充满活力、轻松无忧的国际化租赁社区。建筑概览：总用地面积8292平方米，总建筑面积51593.86平方米，地下2层，南塔地上21层，北塔地上16层，共579间房间。房型包括豪华单间、行政单间、一房豪华式公寓、两房行政公寓等多种户型。公共设施包括游泳池、健身房、瑜伽室、咖啡吧、会议室、KTV等。",
    },
  ])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuestion, setEditQuestion] = useState("")
  const [editAnswer, setEditAnswer] = useState("")

  const [isAdding, setIsAdding] = useState(false)
  const [newQuestion, setNewQuestion] = useState("")
  const [newAnswer, setNewAnswer] = useState("")

  const handleEdit = (question: Question) => {
    setEditingId(question.id)
    setEditQuestion(question.question)
    setEditAnswer(question.answer)
  }

  const handleSaveEdit = (id: string) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, question: editQuestion, answer: editAnswer } : q)))
    setEditingId(null)
    setEditQuestion("")
    setEditAnswer("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditQuestion("")
    setEditAnswer("")
  }

  const handleDelete = (id: string) => {
    if (confirm("确定要删除这个问题吗？")) {
      setQuestions(questions.filter((q) => q.id !== id))
    }
  }

  const handleAddQuestion = () => {
    if (newQuestion.trim() && newAnswer.trim()) {
      const newQ: Question = {
        id: Date.now().toString(),
        question: newQuestion,
        answer: newAnswer,
      }
      setQuestions([...questions, newQ])
      setNewQuestion("")
      setNewAnswer("")
      setIsAdding(false)
    }
  }

  const handleCancelAdd = () => {
    setNewQuestion("")
    setNewAnswer("")
    setIsAdding(false)
  }

  return (
    <div className="p-4 md:p-8 max-w-full md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
      <h1 className="text-xl md:text-2xl font-semibold text-foreground mb-6 md:mb-8">测试题集</h1>

      <div className="space-y-4">
        {questions.map((question) => (
          <div key={question.id} className="border border-border rounded-lg p-4 space-y-3 bg-background">
            {editingId === question.id ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">问题</Label>
                  <Textarea
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    className="min-h-[60px] resize-none border-border focus:border-foreground"
                    placeholder="请输入问题..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">标准答案</Label>
                  <Textarea
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    className="min-h-[120px] resize-none border-border focus:border-foreground"
                    placeholder="请输入标准答案..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveEdit(question.id)}
                    className="bg-foreground text-background hover:bg-foreground/90"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    确定
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">问题</Label>
                  <p className="text-sm text-foreground">{question.question}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">标准答案</Label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{question.answer}</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(question)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(question.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}

        {isAdding && (
          <div className="border border-border rounded-lg p-4 space-y-3 bg-background">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">问题</Label>
              <Textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="min-h-[60px] resize-none border-border focus:border-foreground"
                placeholder="请输入问题..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">标准答案</Label>
              <Textarea
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                className="min-h-[120px] resize-none border-border focus:border-foreground"
                placeholder="请输入标准答案..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelAdd}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleAddQuestion}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                <Check className="h-4 w-4 mr-1" />
                确定
              </Button>
            </div>
          </div>
        )}

        {!isAdding && (
          <div className="flex justify-end pt-2">
            <Button onClick={() => setIsAdding(true)} variant="outline" className="border-border hover:bg-secondary">
              新增问题
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
