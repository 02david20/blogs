---
title: "10 Mice, 1,000 Bottles, and the Computer Science Trick Hiding in Plain Sight"
description: "The classic poisoned-bottle puzzle is really a lesson in binary encoding: ten mice are ten bits, and ten bits can tell 1,024 bottles apart."
pubDate: 2026-09-27T18:00:00
tags: ["Algorithms", "Binary", "Information Theory", "Puzzles"]
categories: ["Computer Science"]
---

You have **1,000 bottles**. Exactly **one contains poison**.

You also have **10 mice**, and the poison has one annoying but convenient property:

> If a mouse drinks the poison, it dies exactly 24 hours later.

You get **one round of testing**. No second round. No "let's give them another sip and see what happens." Just **10 mice, 1,000 bottles, and one very uncomfortable day at the office.**

**How do you find the poisoned bottle?**

The obvious answer is "we need 1,000 mice." Unfortunately, your mouse budget is 10.

But here's the trick: **you don't need each mouse to represent a bottle. You need each mouse to represent a bit.**

And suddenly this stops being a mouse puzzle and starts looking suspiciously like computer science.

## Each mouse is a bit

After 24 hours, every mouse is in one of two states:

```text
Mouse survives → 0
Mouse dies     → 1
```

That's exactly one binary bit. Congratulations: we have replaced silicon with rodents.

So the real question is: **how many different outcomes can 10 bits represent?**

```text
2¹⁰ = 1,024
```

That's more than our 1,000 bottles. Ten mice are enough. Actually, they're slightly overqualified: 24 possible mouse configurations are just sitting around doing nothing.

## Give every bottle a binary code

Number the bottles `0` to `999` and write each number in 10 binary bits:

```text
Bottle 0    → 0000000000
Bottle 1    → 0000000001
Bottle 2    → 0000000010
Bottle 3    → 0000000011
...
Bottle 13   → 0000001101
...
Bottle 999  → 1111100111
```

Now give each bit to a mouse, starting from the rightmost bit: bit 1 → Mouse 1, bit 2 → Mouse 2, …, bit 10 → Mouse 10.

A bottle's binary code tells you **which mice drink from it**:

```text
             M1 M2 M3 M4 M5 M6 M7 M8 M9 M10
Bottle 0     0  0  0  0  0  0  0  0  0  0
Bottle 1     1  0  0  0  0  0  0  0  0  0
Bottle 2     0  1  0  0  0  0  0  0  0  0
Bottle 3     1  1  0  0  0  0  0  0  0  0
...
Bottle 13    1  0  1  1  0  0  0  0  0  0
...
Bottle 999   1  1  1  0  0  1  1  1  1  1
```

Read it by column and you get each mouse's recipe: **Mouse k drinks a drop from every bottle whose bit k is `1`.** Mix those drops into one cocktail per mouse, serve all ten at once, and wait.

That's the entire trick.

## Let's try bottle 13

Suppose bottle 13 is the poisoned one:

```text
Mouse:   10  9  8  7  6  5  4  3  2  1
         ─────────────────────────────
Bottle:   0  0  0  0  0  0  1  1  0  1
```

Only mice 1, 3, and 4 had bottle 13 in their cocktail. After 24 hours:

```text
Mouse 1  ☠      Mouse 6  🙂
Mouse 2  🙂     Mouse 7  🙂
Mouse 3  ☠      Mouse 8  🙂
Mouse 4  ☠      Mouse 9  🙂
Mouse 5  🙂     Mouse 10 🙂
```

Read the mice from 10 down to 1 and the death pattern is `0000001101`, which is `8 + 4 + 1 = 13`.

> **Bottle 13 is poisoned.**

The mice have collectively become a binary number. Which is perhaps the strangest sentence you'll read today.

## Why exactly 10?

Every mouse doubles the number of outcomes:

```text
Mice    Outcomes
1       2
2       4
3       8
...
9       512
10      1,024
```

We need the smallest `n` with `2ⁿ ≥ 1,000`:

```text
n ≥ log₂(1,000) ≈ 9.97   →   n = 10
```

Not because mice are particularly intelligent. Because **10 bits can encode 1,024 possibilities.**

This is really a statement about **information**. Before the experiment there are 1,000 equally likely answers, and telling them apart takes about 9.97 bits. Each mouse contributes at most one bit. The mice weren't doing complicated chemistry. They were transmitting information: very slowly, and with considerably worse employee benefits than a CPU.

Drop the poison and the formula is one you'll use constantly when sizing IDs, bit fields, and packet formats:

```text
bits required = ⌈log₂(N)⌉

N = 10              → 4 bits
N = 1,000           → 10 bits
N = 1,000,000       → 20 bits
N = 1,000,000,000   → 30 bits
```

An 11th mouse would give you 2,048 outcomes: plenty of spare capacity, but no better answer.

## It's an encoding problem

Step back and look at what we did:

```text
             ENCODE

Bottle 42 ─────────────→ 0000101010   (which mice drink)


             DECODE

0000101010 ────────────→ Bottle 42    (which mice died)
```

The ten mice are a physical **bitset**: instead of tracking `mouse_1 = alive, mouse_2 = dead, ...`, the whole experiment compresses into one 10-bit number.

The same idea runs through binary protocols, bit fields, network packet formats, database indexes, compression, hashing, and storage systems. The humble poisoned-bottle puzzle is a tiny lesson in information encoding.

## The cousin: Bloom filters

This brings us back to our previous topic, **[Bloom filters](/blog/bloom-filtering/)**, which also represent information with a row of bits. When you add an item, hash functions decide which bits to set:

```text
             "cat"
               │
       ┌───────┼───────┐
       ↓       ↓       ↓
     Hash 1  Hash 2  Hash 3
       ↓       ↓       ↓
       2       5       8
       │       │       │
       └───────┼───────┘
               ↓
        Set those bits
```

The difference is that the mouse puzzle's codes are **deliberately unique**, while a Bloom filter lets different items share bits:

```text
Mouse puzzle                   Bloom filter

Bottle A → 0010110101          Item A → bits 2, 5, 8
Bottle B → 0010110110          Item B → bits 1, 5, 8
                               Item C → bits 2, 4, 8
Different codes
↓                              Bits overlap
Always distinguishable         ↓
                               False positives possible
```

The mouse puzzle asks: **"How can I encode 1,000 possibilities with as few binary signals as possible?"**

A Bloom filter asks: **"How can I represent membership in very little memory, accepting a small chance of false positives?"**

Same family. Different personalities.

## One important assumption

The classic solution assumes a single observation period in which every mouse either dies or doesn't. If the poison acts at varying speeds, if there are limits on how samples can be mixed, or if you get multiple rounds, it becomes a different problem with different strategies.

So before you start calculating, ask: **what are the rules?** In computer science, the constraints often matter more than the algorithm.

## Final thought

The next time someone gives you this puzzle, don't think "how do I use 10 mice to test 1,000 bottles?"

Think: **"how many bits of information do I need?"**

```text
10 MICE → 10 BITS → 1,024 STATES → 1,000 BOTTLES → ONE ANSWER
```

A bit isn't just a `0` or `1`. It's a tiny container for information. Combine enough of them and you can represent numbers, characters, images, instructions, and apparently **the location of poison.**

The mice were never the clever part. **The encoding was.**

And somewhere, a computer scientist is looking at those 10 mice and thinking:

> "That's a pretty inefficient bitset."
