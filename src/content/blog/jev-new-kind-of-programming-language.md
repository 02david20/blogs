---
title: "Jev and the Case for a New Kind of Programming Language"
description: "Putting a probability in a type is an old idea. The fun part is a compiler that refuses to count the same evidence twice, works out thresholds from costs, and lets you replay every decision your program ever made."
pubDate: 2026-09-27T20:00:00
tags: ["Programming Languages", "AI", "LLM", "Type Systems", "Probabilistic Programming"]
categories: ["Computer Science"]
---

Here's a bug that's very easy to write.

A payment comes in. One model looks at the amount and the customer's history and says:

> "Fraud? Probably. **0.8**."

A second model looks at the customer's history and says:

> "Account takeover? Maybe. **0.7**."

So someone writes the obvious thing:

```python
risk = fraud_score * takeover_score   # 0.56
if risk > 0.5:
    block()
```

It compiles. It runs. It ships.

And it's wrong in two different ways.

**Wrong #1:** multiplying two probabilities only works if they're independent. These two aren't. Both models read the same customer history, so you're basically counting the same clue twice.

**Wrong #2:** where did `0.5` come from? Someone typed it. It secretly encodes "how bad is blocking a good customer compared to letting fraud through," but that decision isn't written down anywhere. It's just... a vibe.

The language had no chance to complain about either mistake, because as far as it's concerned, `0.8` and `0.7` are just floats.

This post is about a language that *would* complain.

## Wait, hasn't someone done this already?

Yes. Kind of. And it's worth being honest about that up front.

The obvious idea is "make uncertainty a type." Something like `belief<T>`.

Microsoft Research did almost exactly this back in 2014 with [**Uncertain\<T\>**](https://www.microsoft.com/en-us/research/publication/uncertaint-a-first-order-type-for-uncertain-data-2/). It wrapped values like GPS readings in a probability distribution, and it had a really neat trick: an `if` on an uncertain boolean wasn't a simple threshold check, it ran a little statistical test until it was confident enough to pick a branch.

Before that, there were whole **probabilistic programming languages** (Stan, Pyro, Church, and friends) where any value can be a distribution. And more recently, tools like DSPy, LMQL and BAML already treat AI model output as typed program data.

So "put the probability in the type" isn't new.

If there's something new here, it has to be somewhere else.

My take: the interesting part isn't *storing* uncertainty. A float can do that.

**The interesting part is what the compiler refuses to let you do.**

## Why bring this up now?

`Uncertain<T>` never went mainstream. I don't know every reason, but my guess is that in 2014 most developers just didn't have many uncertain values lying around. Unless you were writing GPS or sensor code, you never needed it.

That's changed a lot.

Today, basically every classifier, ranker, search step and AI agent tool choice spits out a value that's really a guess. And models like **Jev** from TypeSafe AI push this even further.

According to [TypeSafe's announcement](https://typesafe.ai/blog/introducing-system-one-models-and-jev), Jev doesn't generate text at all. You define the possible answers up front, and it gives you back a structured decision with confidence scores attached. They say it's trained specifically to be calibrated, and responds in about 70–500 ms, which is way faster and cheaper than a big LLM.

Ask it "is this message a refund request, a technical problem, or an account question?" and you get something like:

```text
refund_requested     0.93
technical_problem    0.18
account_question     0.04
```

That's not a paragraph for a human to read.

That's **program state**. Your code can use it directly.

(Quick caveat: those speed and calibration numbers come from TypeSafe themselves. I haven't seen independent benchmarks yet.)

But the trend is the point. When a guess costs a fraction of a cent and a couple hundred milliseconds, programs are going to be *full* of guesses.

So the question becomes: does your language help you handle them, or does it let you quietly pretend they're facts?

## The idea in one sentence

Think about Rust's borrow checker for a second.

It doesn't make your code faster. It just makes a whole category of memory bugs **impossible to write**.

I want the same thing, but for evidence:

> A language that won't let you **count the same evidence twice**, won't let you **act on a guess without saying what being wrong costs**, and **records every decision** so you can replay it later, without the model.

A borrow checker for beliefs.

Here's how it could work, in four pieces.

## Piece 1: A belief remembers where it came from

In this language, `belief<T>` isn't just a float in a costume. It carries a bit of baggage:

```text
belief<T> = {
  dist:        Dist<T>,          // the actual probabilities
  strength:    EvidenceWeight,   // how much evidence is behind them
  evidence:    Set<EvidenceId>,  // which inputs it came from
  calibration: CertRef           // who vouches for these numbers
}
```

Two of these fields deserve a quick explanation.

**`strength`** is there because `0.5` can mean two totally different things:

> "I've looked at ten thousand cases, and it really is a coin flip."

versus:

> "I have no idea."

Same float. Very different situations. The first means *just pick one*. The second means *go get more information*.

**`evidence`** is how we catch the bug from the start of this post. Every time a model produces a belief, it gets tagged with the inputs it looked at. Combine two beliefs, and the result gets both sets of tags.

Now the compiler can actually say something useful:

```text
let fraud    = infer(FraudModel,    txn, history)   // evidence: {txn#1, hist#7}
let takeover = infer(TakeoverModel, history)        // evidence: {hist#7}

let risk = fraud and takeover
// error: shared evidence
//   `fraud` and `takeover` both come from hist#7 (customer history).
//   `and` assumes they're independent, so hist#7 would be counted twice.
//   help: use `and_joint(fraud, takeover, model: RiskJoint)`
//         or `assume_independent(fraud, takeover)` if you're sure
```

`assume_independent` is basically Rust's `unsafe` for beliefs. You're allowed to use it. You're just not allowed to do it *by accident*, and anyone reading the code can grep for it.

Notice that `not fraud` needs no such check. It only touches one belief, so there's nothing to double-count. The rule isn't "uncertainty is scary." It's "combining evidence makes an assumption, so say it out loud."

This also answers the question these kinds of posts love to ask and then run away from:

> "What does `A and B` even mean for beliefs?"

Honest answer: **there's no single right one.** Plain probability, fuzzy logic, Dempster–Shafer, and [subjective logic](https://www.auai.org/uai2016/tutorials_pres/subj_logic.pdf) all give different answers, and researchers haven't agreed on a winner.

So the language shouldn't pretend. The default `and` is plain probability, and it only works when the evidence doesn't overlap. Anything fancier, you have to name.

## Piece 2: You can't `if` a belief. You have to `decide`.

This doesn't compile:

```text
if fraud { block() }
// error: cannot branch on belief<bool>
//   help: use `decide`
```

But forcing people to write `if fraud > 0.9` wouldn't really fix anything. The `0.9` is still a number someone pulled out of thin air.

So `decide` doesn't take a threshold at all.

It takes **costs**:

```text
decide fraud -> Action {
  allow:  cost(fraud: 500, legit: 0)     // missed fraud: chargeback + fees
  verify: cost(fraud: 3,   legit: 3)     // send an SMS code: a bit annoying
  block:  cost(fraud: 0,   legit: 40)    // blocked a real customer: support call, maybe they leave
}
```

And then the compiler works out the thresholds for you. (It's just comparing expected costs: `500p` to allow, `3` to verify, `40(1 − p)` to block.)

```text
allow   if p < 0.006
verify  if 0.006 ≤ p < 0.925
block   if p ≥ 0.925
```

Look at that first line again.

With these costs, you should send a verification code whenever there's more than a **0.6%** chance of fraud.

Nobody would ever type `0.006` by hand. It looks ridiculous.

But it falls straight out of the fact that missing a fraud costs about **170 times** more than sending a text message.

That's the whole point. The threshold was never the real decision. **The costs were.** They were just hiding inside a magic number.

(This is simplified, of course. It assumes verification always catches fraud, and the costs themselves are estimates. But now the argument is "is a blocked customer really worth $40?" instead of "is 0.9 right?", and that's a question your business can actually answer.)

## Piece 3: Every decision can be replayed

Here's the catch with `belief<T>`: once something is uncertain, everything that touches it has to deal with it.

If you've used `async`, you know this feeling. It spreads.

Instead of fighting that, lean into it. Put it right in the function signature:

```text
fn triage(msg: Message) -> Action uses infer {
  let intent = infer(IntentModel, msg)
  decide intent -> Action { ... }
}
```

`uses infer` means "this function's behavior depends on what some model believed." The spreading becomes documentation.

And here's the payoff. In production, `infer` calls the model **and logs every belief it gets back**. In a test, or when you're investigating an incident, you swap it for a version that reads from the log instead:

```text
replay triage(msg) with beliefs from "incident-4471.beliefs"
// → Action::Verify   (exactly what production did on March 3rd)
```

Same beliefs in, same decisions out. Every single time.

That gets you three really nice things:

- **Unit tests that never call a model.** Write the beliefs you want as test fixtures, then check the actions.
- **Real answers to "why did we block this customer?"** Here are the beliefs, where the evidence came from, which cost table was used, and the replayed decision.
- **Catching model drift.** Run the same inputs through last month's model and this month's, compare the logs, and see exactly which decisions changed.

This is what "the uncertainty lives in the data, not in the logic" actually looks like when you can test it.

## Piece 4: Only pay for the expensive model when it matters

Say you've got two models: a cheap, fast one and an expensive, accurate one.

The usual trick is "try the cheap one first, and if it's unsure, ask the expensive one." But "unsure" is usually... another magic number.

With `decide`, the compiler already knows where the decision boundaries are: `0.006` and `0.925`.

So if the cheap model says:

> "Somewhere between 0.2 and 0.4."

...then who cares what the expensive model thinks? Anywhere in that range, the answer is `verify`. Calling the big model can't change anything.

```text
let fraud = infer(FraudModel.fast, txn)
                refine_with FraudModel.accurate
                when near_boundary(decide_fraud)
```

The compiler skips the expensive call, and it can explain *why* using your cost table, instead of a gut-feel "confidence below 0.7" rule.

One big catch, though: this only works if the cheap model is honest about how unsure it is.

Which brings us to the one problem types can't fix.

## Calibration: trust, but verify

Everything above assumes that when a model says `0.91`, it means it. That if you collected every case it scored around `0.91`, roughly 91% of them would actually be fraud.

That's called **calibration**, and you really can't take it for granted. Back in 2017, [Guo et al.](https://arxiv.org/abs/1706.04599) showed that modern neural networks tend to be **overconfident**. And when researchers [asked LLMs to rate their own confidence](https://arxiv.org/abs/2306.13063), the results were pretty similar.

TypeSafe says Jev is trained to be calibrated. Maybe it is! But the language shouldn't take anyone's word for it. Including mine.

So the last piece is a kind of certificate a model has to show before you can plug it in:

```text
model FraudNet: provides belief<bool>
  calibrated  ece <= 0.02  on ReferenceSet("payments-2026Q3")
  valid_until 2026-12-31

let fraud = infer(FraudNet, txn)   // refuses to build without a valid, unexpired certificate
```

To be clear: this is **not** a proof. Calibration is measured on sample data, and it quietly gets worse as the world changes. It's much more like an **HTTPS certificate** than a type. It has an expiry date, you keep an eye on it, and you renew it.

What the language adds is simple: you can't plug an unverified model into a `decide` without someone explicitly signing off on it.

And notice this isn't really an *AI* feature. The same certificate idea works for anything that produces guesses: a neural net, a boring logistic regression, a sensor, a human reviewer. The language doesn't care what's behind `belief<T>`. It just cares that the numbers are vouched for and the evidence is counted honestly.

## What this doesn't fix

Let's be honest about the limits:

- **It only tracks evidence it can see.** If two models were trained on the same data, they're related in ways no tag will ever catch.
- **Costs are guesses too.** That `$40` is an estimate. At least now it's written down where someone can argue with it.
- **Picking what `and` means is still your call.** The language makes you choose. It can't choose for you.
- **It's not free.** Tracking evidence and logging every belief costs memory and disk. Fine for a fraud check. Maybe not fine in a tight loop.

## Coming full circle

Programming languages have this fun habit of eventually compiling themselves. You write the first compiler in C, then write the next one in your new language, and from then on the language maintains itself.

This language has a nice version of that story.

Remember Piece 4? The compiler is constantly making uncertain calls. Is this model worth the latency? Would a better estimate even change the answer? Is this certificate still good?

Those are exactly the kinds of decisions `belief<T>` and `decide` were built for.

So the natural language to write this compiler in... is itself.

Here's the refund example from earlier, written the way I think it should look:

```text
fn handle(msg: Message) -> Action uses infer {
  let intent = infer(Jev.intent, msg)          // certified, evidence-tagged, logged

  decide intent -> Action {
    refund:   cost(refund_requested: 0,  other: 25)
    ask_user: cost(refund_requested: 4,  other: 4)
    route:    cost(refund_requested: 30, other: 0)
  }
}
```

No magic thresholds. No guesses pretending to be facts. No evidence counted twice.

And a year from now, you can replay any decision it made, without the model, and get the exact same answer.

The guesses are uncertain. The rules aren't.

That's what a new kind of programming language could actually give us. Not randomness. Not "just write English." Just **programs that can reason about a world they don't fully understand, and still explain exactly what they did.**
