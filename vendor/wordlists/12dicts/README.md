# 12dicts Word Grid source

Word Grid uses Alan Beale's public-domain **3of6game** list from the official
12dicts **6.0.2** release. Thank you to Alan Beale for compiling these lists.

- Official project: <https://wordlist.aspell.net/12dicts/>
- Official archive: <https://downloads.sourceforge.net/wordlist/12dicts-6.0.2.zip>
- Primary documentation: <https://wordlist.aspell.net/12dicts-readme/>
- Upstream archive member: `International/3of6game.txt`
- Member timestamp: **2016-04-12 07:29:06** (ZIP local timestamp; timezone unspecified).
- Archive README timestamp: **2016-06-20 09:54:08** (not a claimed release date).
- Retrieved: **2026-10-11**.
- Archive SHA-256: `64ac1d35acb66b550c7ebc56e080b62e0bad8f5984d72059dc2e05ac48780e52`.
- Unmodified source SHA-256: `ad7b041b98e09a30ae9f4938ac24ca919a434b021a6b8582a69ad5d4863dabf0`.
- Source size: **672,058 bytes**, **64,662 lines**. Original CRLF line endings
  are preserved; `.gitattributes` disables text conversion for this source.

The archive's `ReadMe.html` and the primary documentation state:

> The 12dicts lists were compiled by Alan Beale. I explicitly release them to
> the public domain, but request acknowledgment of their use.

The following parenthetical exception concerns `2of12inf` and the `2+2+3`
lists because they depend on AGID. It does **not** concern `3of6game`; this
repository vendors only `3of6game`, not those lists or their license chains.
The application's proprietary license does not restrict this public-domain
source or its mechanically generated dictionary.

`3of6game` was designed for word games. It includes inflections and British
and American forms, with annotations (`!`, `+`, `&`, `^`, `$`) documented
upstream. The builder removes only these recognized annotations, uppercases
ASCII alphabetic entries, discards entries shorter than three letters or
containing other characters, deduplicates, and sorts by ASCII order.

Run `npm run dictionary:boggle` after deliberately updating this source and
its pinned hash in the builder. Run `npm run dictionary:boggle:check` to
verify the committed artifact. Neither command nor the app fetches a word
list; source retrieval is a manual maintenance operation. The generated
module is bundled into the app's precached JavaScript.
